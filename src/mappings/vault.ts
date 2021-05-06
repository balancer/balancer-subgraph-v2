import { BigInt, BigDecimal, Address, log } from '@graphprotocol/graph-ts';
import { Swap as SwapEvent, PoolBalanceChanged, PoolBalanceManaged } from '../types/Vault/Vault';
import { Balancer, Pool, PoolToken, Swap, Join, Exit, Investment, TokenPrice } from '../types/schema';
import {
  tokenToDecimal,
  getPoolTokenId,
  getTokenPriceId,
  scaleDown,
  createPoolSnapshot,
  saveSwapToSnapshot,
} from './helpers';
import { isPricingAsset, updatePoolLiquidity, valueInUSD } from './pricing';
import { ZERO_BD } from './constants';

let ZERO = BigInt.fromI32(0);

/************************************
 ****** DEPOSITS & WITHDRAWALS ******
 ************************************/

export function handleBalanceChange(event: PoolBalanceChanged): void {
  let amounts: BigInt[] = event.params.deltas;

  if (amounts.length === 0) {
    return;
  }
  if (amounts[0].gt(ZERO)) {
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
    log.warning('Pool not found in handlePoolJoined: {} {}', [poolId, transactionHash.toHexString()])
    return;
  }
  let tokenAddresses = pool.tokensList;

  let joinId = transactionHash.toHexString().concat(logIndex.toString());
  let join = new Join(joinId);
  join.sender = event.params.liquidityProvider;
  let joinAmounts = new Array<BigDecimal>(amounts.length);
  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    let poolTokenId = getPoolTokenId(poolId, tokenAddress);
    let poolToken = PoolToken.load(poolTokenId);
    let joinAmount = scaleDown(amounts[i], poolToken.decimals);
    joinAmounts[i] = joinAmount;
  }
  join.amounts = joinAmounts;
  join.pool = event.params.poolId.toHexString();
  join.user = event.params.liquidityProvider.toHexString();
  join.timestamp = blockTimestamp;
  join.tx = transactionHash;
  join.save();

  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    let poolTokenId = getPoolTokenId(poolId, tokenAddress);
    let poolToken = PoolToken.load(poolTokenId);
    // adding initial liquidity
    if (poolToken == null) {
      throw new Error('poolToken not found');
    }
    let tokenAmountIn = tokenToDecimal(amounts[i], poolToken.decimals);
    let newAmount = poolToken.balance.plus(tokenAmountIn);
    poolToken.balance = newAmount;
    poolToken.save();
    if (isPricingAsset(tokenAddress)) {
      updatePoolLiquidity(poolId, event.block.number, tokenAddress);
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
  let tokenAddresses = pool.tokensList;

  pool.save();

  let exitId = transactionHash.toHexString().concat(logIndex.toString());
  let exit = new Exit(exitId);
  exit.sender = event.params.liquidityProvider;
  let exitAmounts = new Array<BigDecimal>(amounts.length);
  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    let poolTokenId = getPoolTokenId(poolId, tokenAddress);
    let poolToken = PoolToken.load(poolTokenId);
    let exitAmount = scaleDown(amounts[i].neg(), poolToken.decimals);
    exitAmounts[i] = exitAmount;
  }
  exit.amounts = exitAmounts;
  exit.pool = event.params.poolId.toHexString();
  exit.user = event.params.liquidityProvider.toHexString();
  exit.timestamp = blockTimestamp;
  exit.tx = transactionHash;
  exit.save();

  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    let poolTokenId = getPoolTokenId(poolId, tokenAddress);
    let poolToken = PoolToken.load(poolTokenId);
    // adding initial liquidity
    if (poolToken == null) {
      throw new Error('poolToken not found');
    }
    let tokenAmountOut = tokenToDecimal(amounts[i].neg(), poolToken.decimals);
    let newAmount = poolToken.balance.minus(tokenAmountOut);
    poolToken.balance = newAmount;
    poolToken.save();
    if (isPricingAsset(tokenAddress)) {
      updatePoolLiquidity(poolId, event.block.number, tokenAddress);
    }
  }

  createPoolSnapshot(poolId, blockTimestamp);
}

/************************************
 ********** INVESTMENTS *************
 ************************************/
export function handleBalanceManage(event: PoolBalanceManaged): void {
  let poolId = event.params.poolId;
  let token: Address = event.params.token;
  let assetManagerAddress: Address = event.params.assetManager;

  //let cashDelta = event.params.cashDelta;
  let managedDelta = event.params.managedDelta;

  let poolTokenId = getPoolTokenId(poolId.toHexString(), token);
  let poolToken = PoolToken.load(poolTokenId);

  let managedDeltaAmount = tokenToDecimal(managedDelta, poolToken.decimals);

  poolToken.invested = poolToken.invested.plus(managedDeltaAmount);
  poolToken.save();

  let assetManagerId = poolTokenId.concat(assetManagerAddress.toHexString());

  let investment = new Investment(assetManagerId);
  investment.assetManagerAddress = assetManagerAddress;
  investment.poolTokenId = poolTokenId;
  investment.amount = managedDeltaAmount;
  investment.timestamp = event.block.timestamp.toI32();
  investment.save();
}

/************************************
 ************** SWAPS ***************
 ************************************/
export function handleSwapEvent(event: SwapEvent): void {
  let poolId = event.params.poolId;

  let tokenInAddress: Address = event.params.tokenIn;
  let tokenOutAddress: Address = event.params.tokenOut;

  let logIndex = event.logIndex;
  let transactionHash = event.transaction.hash;
  let swapId = transactionHash.toHexString().concat(logIndex.toString());
  let swap = new Swap(swapId);

  let poolTokenInId = getPoolTokenId(poolId.toHexString(), tokenInAddress);
  let poolTokenIn = PoolToken.load(poolTokenInId);

  let poolTokenOutId = getPoolTokenId(poolId.toHexString(), tokenOutAddress);
  let poolTokenOut = PoolToken.load(poolTokenOutId);

  let tokenAmountIn: BigDecimal = scaleDown(event.params.amountIn, poolTokenIn.decimals);
  let tokenAmountOut: BigDecimal = scaleDown(event.params.amountOut, poolTokenOut.decimals);

  swap.tokenIn = tokenInAddress;
  swap.tokenInSym = poolTokenIn.symbol;
  swap.tokenAmountIn = tokenAmountIn;

  swap.tokenOut = tokenOutAddress;
  swap.tokenOutSym = poolTokenOut.symbol;
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

  // update vault total swap volume
  let vault = Balancer.load('2');
  vault.totalSwapVolume = vault.totalSwapVolume.plus(swapValueUSD);
  vault.save();

  // update pool swapsCount
  let pool = Pool.load(poolId.toHex());
  pool.swapsCount = pool.swapsCount.plus(BigInt.fromI32(1));
  pool.totalSwapVolume = pool.totalSwapVolume.plus(swapValueUSD);

  let swapFee = pool.swapFee;
  let swapFeesUSD = swapValueUSD.times(swapFee);
  pool.totalSwapFee = pool.totalSwapFee.plus(swapFeesUSD);

  pool.save();

  let newInAmount = poolTokenIn.balance.plus(tokenAmountIn);
  poolTokenIn.balance = newInAmount;
  poolTokenIn.save();

  let newOutAmount = poolTokenOut.balance.minus(tokenAmountOut);
  poolTokenOut.balance = newOutAmount;
  poolTokenOut.save();

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
    updatePoolLiquidity(poolId.toHex(), block, tokenInAddress);
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
    updatePoolLiquidity(poolId.toHex(), block, tokenOutAddress);
  }

  createPoolSnapshot(poolId.toHexString(), blockTimestamp);
  saveSwapToSnapshot(poolId.toHexString(), blockTimestamp, swapValueUSD, swapFeesUSD);
}
