import { BigInt, BigDecimal, Address, log } from '@graphprotocol/graph-ts';
import {
  Swap as SwapEvent,
  PoolBalanceChanged,
  PoolBalanceManaged,
  InternalBalanceChanged,
} from '../types/Vault/Vault';
import { Balancer, Pool, Swap, JoinExit, Investment, TokenPrice, UserInternalBalance } from '../types/schema';
import {
  tokenToDecimal,
  getTokenPriceId,
  scaleDown,
  createPoolSnapshot,
  saveSwapToSnapshot,
  getUser,
  getTokenDecimals,
  loadPoolToken,
  getUserSnapshot,
} from './helpers/misc';
import { updatePoolWeights } from './helpers/weighted';
import { isPricingAsset, updatePoolLiquidity, valueInUSD } from './pricing';
import { getToken, SWAP_IN, SWAP_OUT, updateTokenBalances, uptickSwapsForToken } from './helpers/tokens';

import { PoolType, ZERO, ZERO_BD } from './helpers/constants';
import { getBalancerSnapshot } from './helpers/misc';

/************************************
 ******** INTERNAL BALANCES *********
 ************************************/

export function handleInternalBalanceChange(event: InternalBalanceChanged): void {
  getUser(event.params.user);

  let userAddress = event.params.user.toHexString();
  let token = event.params.token;
  let balanceId = userAddress.concat(token.toHexString());

  let userBalance = UserInternalBalance.load(balanceId);
  if (userBalance == null) {
    userBalance = new UserInternalBalance(balanceId);

    userBalance.userAddress = userAddress;
    userBalance.token = token;
    userBalance.balance = ZERO_BD;
  }

  let transferAmount = tokenToDecimal(event.params.delta, getTokenDecimals(token));
  userBalance.balance = userBalance.balance.plus(transferAmount);

  userBalance.save();
}

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
  let blockTimestamp = event.block.timestamp.toI32();
  let logIndex = event.logIndex;
  let transactionHash = event.transaction.hash;

  let pool = Pool.load(poolId);
  if (pool == null) {
    log.warning('Pool not found in handlePoolJoined: {} {}', [poolId, transactionHash.toHexString()]);
    return;
  }
  let tokenAddresses = pool.tokensList;

  let joinId = transactionHash.toHexString().concat(logIndex.toString());
  let join = new JoinExit(joinId);
  join.sender = event.params.liquidityProvider;
  let joinAmounts = new Array<BigDecimal>(amounts.length);
  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    let token = getToken(tokenAddress);
    let joinAmount = scaleDown(amounts[i], token.decimals);
    joinAmounts[i] = joinAmount;
  }
  join.type = 'Join';
  join.amounts = joinAmounts;
  join.pool = event.params.poolId.toHexString();
  join.user = event.params.liquidityProvider.toHexString();
  join.timestamp = blockTimestamp;
  join.tx = transactionHash;
  join.save();

  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    let token = getToken(tokenAddress);
    let poolTokenId = getPoolTokenId(poolId, tokenAddress);
    let poolToken = PoolToken.load(poolTokenId);
    // adding initial liquidity
    if (poolToken == null) {
      throw new Error('poolToken not found');
    }
    let tokenAmountIn = tokenToDecimal(amounts[i], token.decimals);
    let newAmount = poolToken.balance.plus(tokenAmountIn);
    poolToken.balance = newAmount;
    poolToken.save();
  }

  // TODO: why are we looping twice?
  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    if (isPricingAsset(tokenAddress)) {
<<<<<<< HEAD
<<<<<<< HEAD
      updatePoolLiquidity(poolId, event.block.number, tokenAddress, blockTimestamp, event.params.liquidityProvider);
=======
      updatePoolLiquidity(poolId, event.block.number, tokenAddress, blockTimestamp);
>>>>>>> update: add bal snapshot entities
=======
      updatePoolLiquidity(poolId, event.block.number, tokenAddress, blockTimestamp, event.params.liquidityProvider);
>>>>>>> update: add remaining entities
      break;
    }
  }

  createPoolSnapshot(poolId, blockTimestamp);
}

function handlePoolExited(event: PoolBalanceChanged): void {
  let poolId = event.params.poolId.toHex();
  let amounts = event.params.deltas;
  let blockTimestamp = event.block.timestamp.toI32();
  let logIndex = event.logIndex;
  let transactionHash = event.transaction.hash;

  let pool = Pool.load(poolId);
  if (pool == null) {
    log.warning('Pool not found in handlePoolExited: {} {}', [poolId, transactionHash.toHexString()]);
    return;
  }
  let tokenAddresses = pool.tokensList;

  pool.save();

  let exitId = transactionHash.toHexString().concat(logIndex.toString());
  let exit = new JoinExit(exitId);
  exit.sender = event.params.liquidityProvider;
  let exitAmounts = new Array<BigDecimal>(amounts.length);
  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    let token = getToken(tokenAddress);
    let exitAmount = scaleDown(amounts[i].neg(), token.decimals);
    exitAmounts[i] = exitAmount;
  }
  exit.type = 'Exit';
  exit.amounts = exitAmounts;
  exit.pool = event.params.poolId.toHexString();
  exit.user = event.params.liquidityProvider.toHexString();
  exit.timestamp = blockTimestamp;
  exit.tx = transactionHash;
  exit.save();

  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    let token = getToken(tokenAddress);
    let poolTokenId = getPoolTokenId(poolId, tokenAddress);
    let poolToken = PoolToken.load(poolTokenId);
    // adding initial liquidity
    if (poolToken == null) {
      throw new Error('poolToken not found');
    }
    let tokenAmountOut = tokenToDecimal(amounts[i].neg(), token.decimals);
    let newAmount = poolToken.balance.minus(tokenAmountOut);
    poolToken.balance = newAmount;
    poolToken.save();
  }

  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    if (isPricingAsset(tokenAddress)) {
<<<<<<< HEAD
<<<<<<< HEAD
      updatePoolLiquidity(poolId, event.block.number, tokenAddress, blockTimestamp, event.params.liquidityProvider);
=======
      updatePoolLiquidity(poolId, event.block.number, tokenAddress, blockTimestamp);
>>>>>>> update: add bal snapshot entities
=======
      updatePoolLiquidity(poolId, event.block.number, tokenAddress, blockTimestamp, event.params.liquidityProvider);
>>>>>>> update: add remaining entities
      break;
    }
  }

  createPoolSnapshot(poolId, blockTimestamp);
}

/************************************
 ********** INVESTMENTS *************
 ************************************/
export function handleBalanceManage(event: PoolBalanceManaged): void {
  let poolId = event.params.poolId;
  let pool = Pool.load(poolId.toHex());
  if (pool == null) {
    log.warning('Pool not found in handleBalanceManage: {}', [poolId.toHexString()]);
    return;
  }

  let tokenAddress: Address = event.params.token;
  let assetManagerAddress: Address = event.params.assetManager;

  //let cashDelta = event.params.cashDelta;
  let managedDelta = event.params.managedDelta;

  let poolTokenId = getPoolTokenId(poolId.toHexString(), tokenAddress);
  let poolToken = PoolToken.load(poolTokenId);
  let token = getToken(tokenAddress);

  let managedDeltaAmount = tokenToDecimal(managedDelta, token.decimals);

  poolToken.invested = poolToken.invested.plus(managedDeltaAmount);
  poolToken.save();

  let assetManagerId = poolToken.id.concat(assetManagerAddress.toHexString());

  let investment = new Investment(assetManagerId);
  investment.assetManagerAddress = assetManagerAddress;
  investment.poolTokenId = poolToken.id;
  investment.amount = managedDeltaAmount;
  investment.timestamp = event.block.timestamp.toI32();
  investment.save();
}

/************************************
 ************** SWAPS ***************
 ************************************/
export function handleSwapEvent(event: SwapEvent): void {
  getUser(event.transaction.from);
  let poolId = event.params.poolId;

  let pool = Pool.load(poolId.toHex());
  if (pool == null) {
    log.warning('Pool not found in handleSwapEvent: {}', [poolId.toHexString()]);
    return;
  }

  // LBPs' weights update over time so we need to update them after each swap
  // TODO: change to only do this if the LBP is in the middle of an update
  if (pool.poolType == PoolType.LiquidityBootstrapping) {
    updatePoolWeights(poolId.toHexString());
  }

  let tokenInAddress: Address = event.params.tokenIn;
  let tokenOutAddress: Address = event.params.tokenOut;

  let logIndex = event.logIndex;
  let transactionHash = event.transaction.hash;
  let swapId = transactionHash.toHexString().concat(logIndex.toString());
  let swap = new Swap(swapId);

  let poolTokenInId = getPoolTokenId(poolId.toHexString(), tokenInAddress);
  let poolTokenIn = PoolToken.load(poolTokenInId);

  let tokenIn = getToken(tokenInAddress);
  let tokenOut = getToken(tokenOutAddress);

  let tokenIn = getToken(tokenInAddress);
  let tokenOut = getToken(tokenOutAddress);

  let tokenAmountIn: BigDecimal = scaleDown(event.params.amountIn, tokenIn.decimals);
  let tokenAmountOut: BigDecimal = scaleDown(event.params.amountOut, tokenOut.decimals);

  swap.tokenIn = tokenInAddress;
  swap.tokenInSym = tokenIn.symbol;
  swap.tokenAmountIn = tokenAmountIn;

  swap.tokenOut = tokenOutAddress;
  swap.tokenOutSym = tokenOut.symbol;
  swap.tokenAmountOut = tokenAmountOut;

  swap.caller = event.transaction.from;
  swap.userAddress = event.transaction.from.toHex();
  swap.poolId = poolId.toHex();

  let blockTimestamp = event.block.timestamp.toI32();
  swap.timestamp = blockTimestamp;
  swap.tx = transactionHash;
  swap.save();

  let swapValueUSD =
    valueInUSD(tokenAmountOut, tokenOutAddress) || valueInUSD(tokenAmountIn, tokenInAddress) || ZERO_BD;

  // update pool swapsCount
  // let pool = Pool.load(poolId.toHex());
  pool.swapsCount = pool.swapsCount.plus(BigInt.fromI32(1));
  pool.totalSwapVolume = pool.totalSwapVolume.plus(swapValueUSD);

  let swapFee = pool.swapFee;
  let swapFeesUSD = swapValueUSD.times(swapFee);
  pool.totalSwapFee = pool.totalSwapFee.plus(swapFeesUSD);

  pool.save();

  // update vault total swap volume
  let vault = Balancer.load('2');
  let vaultSnapshot = getBalancerSnapshot(vault.id, blockTimestamp);

  vault.totalSwapVolume = vault.totalSwapVolume.plus(swapValueUSD);
  vault.totalSwapFee = vault.totalSwapFee.plus(swapFeesUSD);
  vault.save();

  vaultSnapshot.totalSwapVolume = vault.totalSwapVolume.plus(swapValueUSD);
  vaultSnapshot.totalSwapFee = vault.totalSwapFee.plus(swapFeesUSD);
  vaultSnapshot.save();

  let newInAmount = poolTokenIn.balance.plus(tokenAmountIn);
  poolTokenIn.balance = newInAmount;
  poolTokenIn.save();

  let newOutAmount = poolTokenOut.balance.minus(tokenAmountOut);
  poolTokenOut.balance = newOutAmount;
  poolTokenOut.save();

  // update swap counts for token
  // updates token snapshots as well
  uptickSwapsForToken(tokenInAddress, event);
  uptickSwapsForToken(tokenOutAddress, event);

  // update volume and balances for the tokens
  // updates token snapshots as well
  updateTokenBalances(tokenInAddress, swapValueUSD, tokenAmountIn, SWAP_IN, event);
  updateTokenBalances(tokenOutAddress, swapValueUSD, tokenAmountOut, SWAP_OUT, event);

  let user = getUser(event.transaction.from);
  let userSnapshot = getUserSnapshot(event.transaction.from, blockTimestamp);

  user.totalSwapVolume = user.totalSwapVolume.plus(swapValueUSD);
  user.totalSwapFee = user.totalSwapFee.plus(swapFeesUSD);

  userSnapshot.totalSwapVolume = user.totalSwapVolume.plus(swapValueUSD);
  userSnapshot.totalSwapFee = user.totalSwapFee.plus(swapFeesUSD);

  user.save();
  userSnapshot.save();

  if (swap.tokenAmountOut == ZERO_BD || swap.tokenAmountIn == ZERO_BD) {
    return;
  }

  // Capture price
  let block = event.block.number;
  if (isPricingAsset(tokenInAddress)) {
    let tokenPriceId = getTokenPriceId(poolId.toHex(), tokenOutAddress, tokenInAddress, block);
    let tokenPrice = new TokenPrice(tokenPriceId);
    //tokenPrice.poolTokenId = getPoolTokenId(poolId, tokenOutAddress);
    tokenPrice.poolId = poolId.toHexString();
    tokenPrice.block = block;
    tokenPrice.timestamp = BigInt.fromI32(blockTimestamp);
    tokenPrice.asset = tokenOutAddress;
    tokenPrice.amount = tokenAmountIn;
    tokenPrice.pricingAsset = tokenInAddress;

    tokenPrice.price = tokenAmountIn.div(tokenAmountOut);
    tokenPrice.save();
<<<<<<< HEAD
<<<<<<< HEAD
    updatePoolLiquidity(poolId.toHex(), block, tokenInAddress, blockTimestamp, event.transaction.from);
=======
    updatePoolLiquidity(poolId.toHex(), block, tokenInAddress, blockTimestamp);
>>>>>>> update: add bal snapshot entities
=======
    updatePoolLiquidity(poolId.toHex(), block, tokenInAddress, blockTimestamp, event.transaction.from);
>>>>>>> update: add remaining entities
  }
  if (isPricingAsset(tokenOutAddress)) {
    let tokenPriceId = getTokenPriceId(poolId.toHex(), tokenInAddress, tokenOutAddress, block);
    let tokenPrice = new TokenPrice(tokenPriceId);
    //tokenPrice.poolTokenId = getPoolTokenId(poolId, tokenInAddress);
    tokenPrice.poolId = poolId.toHexString();
    tokenPrice.block = block;
    tokenPrice.timestamp = BigInt.fromI32(blockTimestamp);
    tokenPrice.asset = tokenInAddress;
    tokenPrice.amount = tokenAmountOut;
    tokenPrice.pricingAsset = tokenOutAddress;

    tokenPrice.price = tokenAmountOut.div(tokenAmountIn);
    tokenPrice.save();
<<<<<<< HEAD
<<<<<<< HEAD
    updatePoolLiquidity(poolId.toHex(), block, tokenOutAddress, blockTimestamp, event.transaction.from);
=======
    updatePoolLiquidity(poolId.toHex(), block, tokenOutAddress, blockTimestamp);
>>>>>>> update: add bal snapshot entities
=======
    updatePoolLiquidity(poolId.toHex(), block, tokenOutAddress, blockTimestamp, event.transaction.from);
>>>>>>> update: add remaining entities
  }

  createPoolSnapshot(poolId.toHexString(), blockTimestamp);
  saveSwapToSnapshot(poolId.toHexString(), blockTimestamp, swapValueUSD, swapFeesUSD);
}
