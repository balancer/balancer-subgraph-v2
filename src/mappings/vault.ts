import { BigInt, BigDecimal, Address, Bytes } from '@graphprotocol/graph-ts';
import {
  InternalBalanceDeposited,
  InternalBalanceWithdrawn,
  PoolJoined,
  PoolExited,
  TokensRegistered,
  BatchSwapGivenInCall,
  BatchSwapGivenOutCall,
  Swap as SwapEvent,
  PoolBalanceChanged,
} from '../types/Vault/Vault';
import { Vault } from '../types/Vault/Vault';
import { WeightedPool } from '../types/templates/WeightedPool/WeightedPool';
import { WeightedPool as WeightedPoolTemplate } from '../types/templates';
import { Pool, PoolToken, Swap, TokenPrice, UserBalance, Investment } from '../types/schema';
import {
  tokenToDecimal,
  getPoolTokenId,
  newPoolEntity,
  createPoolTokenEntity,
  getTokenPriceId,
  scaleDown,
  createPoolSnapshot,
} from './helpers';
import { isPricingAsset, updatePoolLiquidity } from './pricing';
import { ZERO_BD } from './constants';

export function handleTokensRegistered(event: TokensRegistered): void {
  let poolId: Bytes = event.params.poolId;
  let tokenAddresses: Address[] = event.params.tokens;

  let pool = Pool.load(poolId.toHexString());
  if (pool === null) {
    pool = newPoolEntity(poolId.toHexString());

    let vaultContract = Vault.bind(event.address);

    let poolDetails = vaultContract.try_getPool(poolId);
    let poolAddress: Address = poolDetails.value.value0;

    let poolContract = WeightedPool.bind(poolAddress);

    let swapFeeCall = poolContract.try_getSwapFee();
    let swapFee = swapFeeCall.value;
    pool.swapFee = swapFee.toBigDecimal();
    pool.createTime = event.block.timestamp.toI32();
    // load pool address from vault

    pool.controller = poolAddress;
    pool.tx = event.transaction.hash;

    // start receiving events
    WeightedPoolTemplate.create(poolAddress);
  }

  let tokensList: Bytes[] = pool.tokensList || [];

  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress = tokenAddresses[i];
    let poolTokenId = getPoolTokenId(poolId.toHexString(), tokenAddress);
    let poolToken = PoolToken.load(poolTokenId);
    if (poolToken == null) {
      if (tokensList.indexOf(tokenAddress) == -1) {
        tokensList.push(tokenAddress);
      }
      createPoolTokenEntity(poolId.toHexString(), tokenAddress);
      poolToken = PoolToken.load(poolTokenId);
      poolToken.save();
    }
  }
  pool.tokensCount = BigInt.fromI32(tokensList.length);
  pool.tokensList = tokensList;
  pool.save();
}

export function handlePoolJoined(event: PoolJoined): void {
  let poolId: string = event.params.poolId.toHexString();
  let amounts: BigInt[] = event.params.amountsIn;
  let blockTimestamp = event.block.timestamp.toI32();

  let pool = Pool.load(poolId);
  let tokenAddresses = pool.tokensList;

  pool.joinsCount = pool.joinsCount.plus(BigInt.fromI32(1));
  pool.save();

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

export function handlePoolExited(event: PoolExited): void {
  let poolId = event.params.poolId.toHex();
  let amounts = event.params.amountsOut;
  let blockTimestamp = event.block.timestamp.toI32();

  let pool = Pool.load(poolId);
  let tokenAddresses = pool.tokensList;

  pool.exitsCount = pool.exitsCount.plus(BigInt.fromI32(1));
  pool.save();

  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    let poolTokenId = getPoolTokenId(poolId, tokenAddress);
    let poolToken = PoolToken.load(poolTokenId);
    // adding initial liquidity
    if (poolToken == null) {
      throw new Error('poolToken not found');
    }
    let tokenAmountOut = tokenToDecimal(amounts[i], poolToken.decimals);
    let newAmount = poolToken.balance.plus(tokenAmountOut);
    poolToken.balance = newAmount;
    poolToken.save();
    if (isPricingAsset(tokenAddress)) {
      updatePoolLiquidity(poolId, event.block.number, tokenAddress);
    }
  }

  createPoolSnapshot(poolId, blockTimestamp);
}

//export function handleRemoveLiquidity(call: RemoveLiquidityCall): void {
//let poolId = call.inputs.poolId.toHex();
//let pool = Pool.load(poolId);

//let poolTokenizer = PoolTokenizer.load(pool.controller.toHex());

//poolTokenizer.joinsCount = poolTokenizer.joinsCount.plus(BigInt.fromI32(1));

//let tokenAddresses = call.inputs.tokens;
//let amounts = call.inputs.amounts;
//for (let i: i32 = 0; i < tokenAddresses.length; i++) {
//let tokenAddress = tokenAddresses[i];
//let poolTokenId = getPoolTokenId(poolId, tokenAddress);
//let poolToken = PoolToken.load(poolTokenId);

//let tokenAmountOut = tokenToDecimal(amounts[i], poolToken.decimals);
//let newAmount = poolToken.balance.minus(tokenAmountOut);
//poolToken.balance = newAmount;
//poolToken.save();
//}

//poolTokenizer.save();
////updatePoolLiquidity(poolId);
//}

export function handleUserBalanceDeposited(event: InternalBalanceDeposited): void {
  let userBalanceId: string = event.params.user.toHexString() + event.params.token.toHexString();
  let userBalance = UserBalance.load(userBalanceId);

  if (userBalance == null) {
    userBalance = new UserBalance(userBalanceId);
    userBalance.userAddress = event.params.user.toHex();
    userBalance.token = event.params.token;
    userBalance.balance = ZERO_BD;
  }
  // TODO tokenToDeciml - amount is a BigInt
  let tokenAmount: BigDecimal = event.params.amount.toBigDecimal();
  userBalance.balance = userBalance.balance.plus(tokenAmount);
  userBalance.save();
}

export function handleUserBalanceWithdrawn(event: InternalBalanceWithdrawn): void {
  let userBalanceId: string = event.params.user.toHexString() + event.params.token.toHexString();
  let userBalance = UserBalance.load(userBalanceId);

  if (userBalance == null) {
    // this should never happen since balances must be > 0
    userBalance = new UserBalance(userBalanceId);
    userBalance.userAddress = event.params.user.toHexString();
    userBalance.token = event.params.token;
    userBalance.balance = ZERO_BD;
  }
  // TODO tokenToDeciml
  let tokenAmount: BigDecimal = event.params.amount.toBigDecimal();
  userBalance.balance = userBalance.balance.minus(tokenAmount);
  userBalance.save();
}

/************************************
 ********** INVESTMENTS *************
 ************************************/
export function handleInvestment(event: PoolBalanceChanged): void {
  let poolId = event.params.poolId;
  let token: Address = event.params.token;
  let investmentManagerAddress: Address = event.params.assetManager;
  let amount = event.params.amount;

  let poolTokenId = getPoolTokenId(poolId.toHexString(), token);
  let poolToken = PoolToken.load(poolTokenId);

  // TODO tokenToDeciml
  let tokenAmount: BigDecimal = amount.toBigDecimal();
  poolToken.invested = poolToken.invested.plus(tokenAmount);
  poolToken.save();

  let investment = new Investment(poolTokenId.concat(investmentManagerAddress.toHexString()));
  investment.investmentManagerAddress = investmentManagerAddress;
  investment.poolTokenId = poolTokenId;
  investment.amount = amount.toBigDecimal();
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

  let tokenAmountIn: BigDecimal = scaleDown(event.params.tokensIn, poolTokenIn.decimals);
  let tokenAmountOut: BigDecimal = scaleDown(event.params.tokensOut, poolTokenOut.decimals);

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

  let zero = BigDecimal.fromString('0');
  if (swap.tokenAmountOut == zero || swap.tokenAmountIn == zero) {
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
}

// Deprecated in favor of events
export function handleBatchSwapGivenIn(call: BatchSwapGivenInCall): void {
  let swaps = call.inputs.swaps;
  let tokens = call.inputs.tokens;

  for (let i: i32 = 0; i < swaps.length; i++) {
    //struct SwapInternal {
    //  bytes32 poolId;
    //  uint128 tokenInIndex;
    //  uint128 tokenOutIndex;
    //  uint128 amount; // amountIn, amountOut
    //  bytes userData;
    //}
    let swapStruct = swaps[i];
    let poolId = swapStruct.poolId;
    let tokenInAddress = tokens[i32(swapStruct.tokenInIndex)];
    let tokenOutAddress = tokens[i32(swapStruct.tokenOutIndex)];

    let swapId = call.transaction.hash.toHexString().concat(i.toString());

    let poolTokenIdIn = getPoolTokenId(poolId.toHexString(), tokenInAddress);
    let poolTokenIn = PoolToken.load(poolTokenIdIn);

    let poolTokenIdOut = getPoolTokenId(poolId.toHexString(), tokenOutAddress);
    let poolTokenOut = PoolToken.load(poolTokenIdOut);

    let swap = new Swap(swapId);
    swap.caller = call.from;
    swap.tokenIn = tokenInAddress;
    swap.tokenInSym = poolTokenIn.symbol;
    swap.tokenOut = tokenOutAddress;
    swap.tokenOutSym = poolTokenOut.symbol;
    swap.userAddress = call.from.toHex();
    swap.poolId = poolId.toHex();

    //swap.value = BigDecimal.fromString('100'); //TODO
    //swap.feeValue = BigDecimal.fromString('1'); //TODO
    //swap.protocolFeeValue = BigDecimal.fromString('0'); //TODO
    swap.timestamp = call.block.timestamp.toI32();
    swap.save();

    let pool = Pool.load(poolId.toHex());
    pool.swapsCount = pool.swapsCount.plus(BigInt.fromI32(1));
    pool.save();
  }
}

// Deprecated in favor of events
export function handleBatchSwapGivenOut(call: BatchSwapGivenOutCall): void {
  let swaps = call.inputs.swaps;
  let tokens = call.inputs.tokens;

  for (let i: i32 = 0; i < swaps.length; i++) {
    //struct SwapInternal {
    //   bytes32 poolId;
    //   uint128 tokenInIndex;
    //   uint128 tokenOutIndex;
    //   uint128 amount; // amountIn, amountOut
    //   bytes userData;
    //}
    let swapStruct = swaps[i];
    let poolId = swapStruct.poolId;
    let tokenInAddress = tokens[i32(swapStruct.tokenInIndex)];
    let tokenOutAddress = tokens[i32(swapStruct.tokenOutIndex)];

    let swapId = call.transaction.hash.toHexString().concat(i.toString());

    let poolTokenIdIn = getPoolTokenId(poolId.toHexString(), tokenInAddress);
    let poolTokenIn = PoolToken.load(poolTokenIdIn);

    let poolTokenIdOut = getPoolTokenId(poolId.toHexString(), tokenOutAddress);
    let poolTokenOut = PoolToken.load(poolTokenIdOut);

    let swap = new Swap(swapId);
    swap.caller = call.from; // TODO
    swap.tokenIn = tokenInAddress;
    swap.tokenInSym = poolTokenIn.symbol;
    swap.tokenOut = tokenOutAddress;
    swap.tokenOutSym = poolTokenOut.symbol;
    swap.userAddress = call.from.toHex();
    swap.poolId = poolId.toHex();
    //swap.value = BigDecimal.fromString('100'); //TODO
    //swap.feeValue = BigDecimal.fromString('1'); //TODO
    //swap.protocolFeeValue = BigDecimal.fromString('0'); //TODO
    swap.timestamp = call.block.timestamp.toI32();
    swap.save();

    let pool = Pool.load(poolId.toHex());
    pool.swapsCount = pool.swapsCount.plus(BigInt.fromI32(1));
    pool.save();
  }
}
