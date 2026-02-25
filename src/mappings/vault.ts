import { BigInt, BigDecimal, Address, log, ethereum, dataSource } from '@graphprotocol/graph-ts';
import { Swap as SwapEvent, PoolBalanceChanged } from '../types/Vault/Vault';
import { Pool, Swap, JoinExit } from '../types/schema';
import {
  tokenToDecimal,
  scaleDown,
  scaleUp,
  loadPoolToken,
  getToken,
  updateTokenBalances,
  bytesToAddress,
  getPoolShare,
} from './helpers/misc';
import { updatePoolWeights } from './helpers/weighted';
import { SWAP_IN, SWAP_OUT, VAULT_ADDRESS, ZERO, ZERO_ADDRESS, ZERO_BD } from './helpers/constants';
import {
  hasVirtualSupply,
  isVariableWeightPool,
  isStableLikePool,
  PoolType,
  isComposableStablePool,
  isManagedPool,
} from './helpers/pools';
import { calculateInvariant, AMP_PRECISION, updateAmpFactor } from './helpers/stable';
import { Transfer } from '../types/Vault/ERC20';
import { handleTransfer } from './poolController';

/************************************
 ****** DEPOSITS & WITHDRAWALS ******
 ************************************/

export function handleBalanceChange(event: PoolBalanceChanged): void {
  let amounts: BigInt[] = event.params.deltas;

  if (amounts.length === 0) {
    return;
  }
  let total: BigInt = amounts.reduce<BigInt>((sum, amount) => sum.plus(amount), new BigInt(0));
  if (total.gt(ZERO)) {
    handlePoolJoined(event);
  } else {
    handlePoolExited(event);
  }
}

function handlePoolJoined(event: PoolBalanceChanged): void {
  let poolId: string = event.params.poolId.toHexString();
  let amounts: BigInt[] = event.params.deltas;
  let protocolFeeAmounts: BigInt[] = event.params.protocolFeeAmounts;
  let blockTimestamp = event.block.timestamp.toI32();
  let logIndex = event.logIndex;
  let transactionHash = event.transaction.hash;

  let pool = Pool.load(poolId);
  if (pool == null) {
    log.warning('Pool not found in handlePoolJoined: {} {}', [poolId, transactionHash.toHexString()]);
    return;
  }

  // if a pool that was paused is joined, it means it's pause has expired
  // TODO: fix this for when pool.isPaused is null
  // TODO: handle the case where the pool's actual swapEnabled is false
  // if (pool.isPaused) {
  //   pool.isPaused = false;
  //   pool.swapEnabled = true;
  // }

  let tokenAddresses = pool.tokensList;

  let joinId = transactionHash.toHexString().concat(logIndex.toString());
  let join = new JoinExit(joinId);
  join.sender = event.params.liquidityProvider;
  let joinAmounts = new Array<BigDecimal>(amounts.length);
  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    let poolToken = loadPoolToken(poolId, tokenAddress);
    if (poolToken == null) {
      throw new Error('poolToken not found');
    }
    let joinAmount = scaleDown(amounts[i], poolToken.decimals);
    joinAmounts[i] = joinAmount;
  }
  join.type = 'Join';
  join.amounts = joinAmounts;
  join.pool = event.params.poolId.toHexString();
  join.user = event.params.liquidityProvider;
  join.timestamp = blockTimestamp;
  join.tx = transactionHash;
  join.block = event.block.number;

  // Month ago
  const storeEventsFrom = dataSource.context().get('storeEventsFrom');
  if (storeEventsFrom && event.block.number > storeEventsFrom.toBigInt()) {
    join.save();
  }

  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    let poolToken = loadPoolToken(poolId, tokenAddress);

    // adding initial liquidity
    if (poolToken == null) {
      throw new Error('poolToken not found');
    }
    let amountIn = amounts[i].minus(protocolFeeAmounts[i]);
    let tokenAmountIn = tokenToDecimal(amountIn, poolToken.decimals);
    let newBalance = poolToken.balance.plus(tokenAmountIn);
    let paidProtocolFees = poolToken.paidProtocolFees ? poolToken.paidProtocolFees : ZERO_BD;
    let protocolFeeAmount = tokenToDecimal(protocolFeeAmounts[i], poolToken.decimals);
    poolToken.paidProtocolFees = paidProtocolFees.plus(protocolFeeAmount);
    poolToken.balance = newBalance;
    poolToken.save();

    let token = getToken(tokenAddress);
    const tokenTotalBalanceNotional = token.totalBalanceNotional.plus(tokenAmountIn);
    token.totalBalanceNotional = tokenTotalBalanceNotional;
    token.save();
  }

  // Managed, StablePhantom and ComposableStable pools only emit the PoolBalanceChanged event
  // with a non-zero value for the BPT amount when the pool is initialized,
  // when the amount of BPT informed in the event corresponds to the "excess" BPT that was preminted
  // and therefore must be subtracted from totalShares
  if (pool.poolType == PoolType.StablePhantom || isComposableStablePool(pool) || isManagedPool(pool)) {
    let preMintedBpt = ZERO;
    let scaledPreMintedBpt = ZERO_BD;
    for (let i: i32 = 0; i < tokenAddresses.length; i++) {
      if (tokenAddresses[i] == pool.address) {
        preMintedBpt = amounts[i];
        scaledPreMintedBpt = scaleDown(preMintedBpt, 18);
      }
    }
    pool.totalShares = pool.totalShares.minus(scaledPreMintedBpt);
    // This amount will also be transferred to the vault,
    // causing the vault's 'user shares' to incorrectly increase,
    // so we need to negate it. We do so by processing a mock transfer event
    // from the vault to the zero address
    const mockEvent = new Transfer(
      bytesToAddress(pool.address),
      event.logIndex,
      event.transactionLogIndex,
      event.logType,
      event.block,
      event.transaction,
      [
        new ethereum.EventParam('from', ethereum.Value.fromAddress(VAULT_ADDRESS)),
        new ethereum.EventParam('to', ethereum.Value.fromAddress(ZERO_ADDRESS)),
        new ethereum.EventParam('value', ethereum.Value.fromUnsignedBigInt(preMintedBpt)),
      ],
      event.receipt
    );
    handleTransfer(mockEvent);
  }

  pool.save();
}

function handlePoolExited(event: PoolBalanceChanged): void {
  let poolId = event.params.poolId.toHex();
  let amounts = event.params.deltas;
  let protocolFeeAmounts: BigInt[] = event.params.protocolFeeAmounts;
  let blockTimestamp = event.block.timestamp.toI32();
  let logIndex = event.logIndex;
  let transactionHash = event.transaction.hash;

  let pool = Pool.load(poolId);
  if (pool == null) {
    log.warning('Pool not found in handlePoolExited: {} {}', [poolId, transactionHash.toHexString()]);
    return;
  }
  let tokenAddresses = pool.tokensList;

  let exitId = transactionHash.toHexString().concat(logIndex.toString());
  let exit = new JoinExit(exitId);
  exit.sender = event.params.liquidityProvider;
  let exitAmounts = new Array<BigDecimal>(amounts.length);
  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    let poolToken = loadPoolToken(poolId, tokenAddress);
    if (poolToken == null) {
      throw new Error('poolToken not found');
    }
    let exitAmount = scaleDown(amounts[i].neg(), poolToken.decimals);
    exitAmounts[i] = exitAmount;
  }
  exit.type = 'Exit';
  exit.amounts = exitAmounts;
  exit.pool = event.params.poolId.toHexString();
  exit.user = event.params.liquidityProvider;
  exit.timestamp = blockTimestamp;
  exit.tx = transactionHash;
  exit.block = event.block.number;

  // Month ago
  const storeEventsFrom = dataSource.context().get('storeEventsFrom');
  if (storeEventsFrom && event.block.number > storeEventsFrom.toBigInt()) {
    exit.save();
  }

  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    let poolToken = loadPoolToken(poolId, tokenAddress);

    // adding initial liquidity
    if (poolToken == null) {
      throw new Error('poolToken not found');
    }
    let amountOut = amounts[i].minus(protocolFeeAmounts[i]).neg();
    let tokenAmountOut = tokenToDecimal(amountOut, poolToken.decimals);
    let newBalance = poolToken.balance.minus(tokenAmountOut);
    let paidProtocolFees = poolToken.paidProtocolFees ? poolToken.paidProtocolFees : ZERO_BD;
    let protocolFeeAmount = tokenToDecimal(protocolFeeAmounts[i], poolToken.decimals);
    poolToken.paidProtocolFees = paidProtocolFees.plus(protocolFeeAmount);
    poolToken.balance = newBalance;
    poolToken.save();

    let token = getToken(tokenAddress);
    const tokenTotalBalanceNotional = token.totalBalanceNotional.minus(tokenAmountOut);
    token.totalBalanceNotional = tokenTotalBalanceNotional;
    token.save();
  }
}

/************************************
 ************** SWAPS ***************
 ************************************/
export function handleSwapEvent(event: SwapEvent): void {
  let poolId = event.params.poolId;

  let pool = Pool.load(poolId.toHexString());
  if (pool == null) {
    log.warning('Pool not found in handleSwapEvent: {}', [poolId.toHexString()]);
    return;
  }

  // if a swap happens in a pool that was paused, it means it's pause has expired
  // TODO: fix this for when pool.isPaused is null
  // TODO: handle the case where the pool's actual swapEnabled is false
  // if (pool.isPaused) {
  //   pool.isPaused = false;
  //   pool.swapEnabled = true;
  // }

  if (isVariableWeightPool(pool)) {
    // Some pools' weights update over time so we need to update them after each swap
    updatePoolWeights(poolId.toHexString());
  } else if (isStableLikePool(pool)) {
    // Stablelike pools' amplification factors update over time so we need to update them after each swap
    updateAmpFactor(pool, event.block.timestamp);
  }

  // If swapping on a pool with preminted BPT and the BPT itself is being swapped then this is equivalent to a mint/burn in a regular pool
  // We need to update the pool's totalShares and add/subtract from the vault's share of that pool, to negate the corresponding transfer event of the BPT
  if (hasVirtualSupply(pool)) {
    if (event.params.tokenIn == pool.address) {
      const scaledAmount = tokenToDecimal(event.params.amountIn, 18);
      pool.totalShares = pool.totalShares.minus(scaledAmount);
      let vaultPoolShare = getPoolShare(poolId.toHexString(), VAULT_ADDRESS);
      let vaultPoolShareBalance = vaultPoolShare == null ? ZERO_BD : vaultPoolShare.balance;
      vaultPoolShareBalance = vaultPoolShareBalance.minus(scaledAmount);
      vaultPoolShare.balance = vaultPoolShareBalance;
      vaultPoolShare.save();
    }
    if (event.params.tokenOut == pool.address) {
      const scaledAmount = tokenToDecimal(event.params.amountOut, 18);
      pool.totalShares = pool.totalShares.plus(scaledAmount);
      let vaultPoolShare = getPoolShare(poolId.toHexString(), VAULT_ADDRESS);
      let vaultPoolShareBalance = vaultPoolShare == null ? ZERO_BD : vaultPoolShare.balance;
      vaultPoolShareBalance = vaultPoolShareBalance.plus(scaledAmount);
      vaultPoolShare.balance = vaultPoolShareBalance;
      vaultPoolShare.save();
    }
  }

  let poolAddress = pool.address;
  let tokenInAddress: Address = event.params.tokenIn;
  let tokenOutAddress: Address = event.params.tokenOut;

  let logIndex = event.logIndex;
  let transactionHash = event.transaction.hash;
  let blockTimestamp = event.block.timestamp.toI32();

  let poolTokenIn = loadPoolToken(poolId.toHexString(), tokenInAddress);
  let poolTokenOut = loadPoolToken(poolId.toHexString(), tokenOutAddress);
  if (poolTokenIn == null || poolTokenOut == null) {
    log.warning('PoolToken not found in handleSwapEvent: (tokenIn: {}), (tokenOut: {})', [
      tokenInAddress.toHexString(),
      tokenOutAddress.toHexString(),
    ]);
    return;
  }

  let tokenAmountIn: BigDecimal = scaleDown(event.params.amountIn, poolTokenIn.decimals);
  let tokenAmountOut: BigDecimal = scaleDown(event.params.amountOut, poolTokenOut.decimals);

  let newInAmount = poolTokenIn.balance.plus(tokenAmountIn);
  poolTokenIn.balance = newInAmount;
  poolTokenIn.save();

  let newOutAmount = poolTokenOut.balance.minus(tokenAmountOut);
  poolTokenOut.balance = newOutAmount;
  poolTokenOut.save();

  let swapId = transactionHash.toHexString().concat(logIndex.toString());

  const isJoinExitSwap = poolAddress == tokenInAddress || poolAddress == tokenOutAddress;
  if (isJoinExitSwap) {
    if (isComposableStablePool(pool)) {
      let tokenAddresses = pool.tokensList;
      let balances: BigInt[] = [];
      for (let i: i32 = 0; i < tokenAddresses.length; i++) {
        let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
        if (tokenAddresses[i] == pool.address) {
          continue;
        }
        let poolToken = loadPoolToken(pool.id, tokenAddress);
        if (poolToken == null) {
          throw new Error('poolToken not found');
        }
        let balance = scaleUp(poolToken.balance.times(poolToken.priceRate), 18);
        balances.push(balance);
      }
      if (pool.amp) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        let amp = pool.amp!.times(AMP_PRECISION);
        let invariantInt = calculateInvariant(amp, balances, swapId);
        let invariant = scaleDown(invariantInt, 18);
        pool.lastPostJoinExitInvariant = invariant;
        pool.lastJoinExitAmp = pool.amp;
      }
    }
  }

  let swap = new Swap(swapId);
  swap.tokenIn = tokenInAddress;
  swap.tokenInSym = poolTokenIn.symbol;
  swap.tokenAmountIn = tokenAmountIn;

  swap.tokenOut = tokenOutAddress;
  swap.tokenOutSym = poolTokenOut.symbol;
  swap.tokenAmountOut = tokenAmountOut;

  swap.caller = event.transaction.from;
  swap.userAddress = event.transaction.from;
  swap.poolId = poolId.toHex();

  swap.timestamp = blockTimestamp;
  swap.tx = transactionHash;
  swap.block = event.block.number;

  // Month ago
  const storeEventsFrom = dataSource.context().get('storeEventsFrom');
  if (storeEventsFrom && event.block.number > storeEventsFrom.toBigInt()) {
    swap.save();
  }

  // update pool swapsCount
  // let pool = Pool.load(poolId.toHex());
  pool.swapsCount = pool.swapsCount.plus(BigInt.fromI32(1));
  pool.save();

  // update volume and balances for the tokens
  // updates token snapshots as well
  updateTokenBalances(tokenInAddress, tokenAmountIn, SWAP_IN);
  updateTokenBalances(tokenOutAddress, tokenAmountOut, SWAP_OUT);

  if (swap.tokenAmountOut == ZERO_BD || swap.tokenAmountIn == ZERO_BD) {
    return;
  }
}
