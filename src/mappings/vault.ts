import { BigInt, BigDecimal, Address, Bytes, store } from '@graphprotocol/graph-ts';
import {
  Deposited,
  Withdrawn,
  AddLiquidityCall,
  RemoveLiquidityCall,
  //SetPoolControllerCall,
  BatchSwapGivenInCall,
  BatchSwapGivenOutCall,
  Swap as SwapEvent,
  PoolBalanceChanged,
} from '../types/Vault/Vault';
import { Balancer, Pool, PoolToken, Swap, TokenPrice, User, UserBalance, PoolTokenizer, Investment } from '../types/schema';
import {
  hexToDecimal,
  tokenToDecimal,
  getPoolTokenId,
  getTokenPriceId,
  createPoolTokenEntity,
  updatePoolLiquidity,
  decrPoolCount,
} from './helpers';
import {
  ZERO_BD,
  WETH,
  WBTC,
  USD,
  USDC,
  DAI,
  BAL
} from './constants';


export function handleAddLiquidity(call: AddLiquidityCall): void {
  let poolId = call.inputs.poolId.toHex();
  let tokenAddresses = call.inputs.tokens;
  let amounts = call.inputs.amounts;

  let pool = Pool.load(poolId);
  let tokensList = pool.tokensList || [];

  let poolTokenizer = PoolTokenizer.load(pool.controller.toHex());
  poolTokenizer.joinsCount = poolTokenizer.joinsCount.plus(BigInt.fromI32(1));
  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress = tokenAddresses[i];
    let poolTokenId = getPoolTokenId(poolId, tokenAddress);
    let poolToken = PoolToken.load(poolTokenId);
    // adding initial liquidity
    if (poolToken == null) {
      if (tokensList.indexOf(tokenAddress) == -1) {
        tokensList.push(tokenAddress);
      }
      createPoolTokenEntity(poolId, tokenAddress);
      poolToken = PoolToken.load(poolTokenId);
    }
    let tokenAmountIn = tokenToDecimal(amounts[i], poolToken.decimals);
    let newAmount = poolToken.balance.plus(tokenAmountIn);
    poolToken.balance = newAmount;
    poolToken.save();
  }
  pool.tokensList = tokensList;
  pool.save();
  poolTokenizer.save();
  //updatePoolLiquidity(poolId);
}

export function handleRemoveLiquidity(call: RemoveLiquidityCall): void {
  let poolId = call.inputs.poolId.toHex();
  let pool = Pool.load(poolId);

  let poolTokenizer = PoolTokenizer.load(pool.controller.toHex());

  poolTokenizer.joinsCount = poolTokenizer.joinsCount.plus(BigInt.fromI32(1));

  let tokenAddresses = call.inputs.tokens;
  let amounts = call.inputs.amounts;
  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress = tokenAddresses[i];
    let poolTokenId = getPoolTokenId(poolId, tokenAddress);
    let poolToken = PoolToken.load(poolTokenId);

    let tokenAmountOut = tokenToDecimal(amounts[i], poolToken.decimals);
    let newAmount = poolToken.balance.minus(tokenAmountOut);
    poolToken.balance = newAmount;
    poolToken.save();
  }

  poolTokenizer.save();
  //updatePoolLiquidity(poolId);
}

export function handleUserBalanceDeposited(event: Deposited): void {
  let userBalanceId: string = event.params.user.toHexString() + event.params.token.toHexString()
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

export function handleUserBalanceWithdrawn(event: Withdrawn): void {
  let userBalanceId: string = event.params.user.toHexString() + event.params.token.toHexString()
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

  let pool = Pool.load(poolId.toHexString());
  let poolTokenId = getPoolTokenId(poolId.toHexString(), token);
  let poolToken = PoolToken.load(poolTokenId);

  // TODO tokenToDeciml
  let tokenAmount: BigDecimal = amount.toBigDecimal()
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
  //let tokenDeltas: BigInt[] = event.params.tokenDeltas;
  let pool = Pool.load(poolId.toHexString());
  let tokensList: Bytes[] = pool.tokensList;

  let tokenInAddress: Address = event.params.tokenIn;
  let tokenOutAddress: Address = event.params.tokenOut;
  let tokenInSym: string;
  let tokenOutSym: string;
  let tokenAmountIn: BigDecimal;
  let tokenAmountOut: BigDecimal;

  let logIndex = event.logIndex;
  let transactionHash = event.transaction.hash;
  let swapId = transactionHash.toHexString().concat(logIndex.toString());
  let swap = new Swap(swapId);

  let poolTokenInId = getPoolTokenId(poolId.toHexString(), tokenInAddress);
  let poolTokenIn = PoolToken.load(poolTokenInId);
  swap.tokenIn = tokenInAddress;
  swap.tokenInSym = poolTokenIn.symbol;
  swap.tokenAmountIn = event.params.tokensIn;

  let poolTokenOutId = getPoolTokenId(poolId.toHexString(), tokenOutAddress);
  let poolTokenOut = PoolToken.load(poolTokenOutId);
  swap.tokenOut = tokenOutAddress;
  swap.tokenOutSym = poolTokenOut.symbol;
  swap.tokenAmountOut = event.params.tokensOut;

  swap.caller = event.transaction.from;
  swap.userAddress = event.transaction.from.toHex();
  swap.poolId = poolId.toHex();

  swap.value = BigDecimal.fromString('100'); //TODO
  swap.feeValue = BigDecimal.fromString('1'); //TODO
  swap.protocolFeeValue = BigDecimal.fromString('0'); //TODO
  swap.poolTotalSwapVolume = BigDecimal.fromString('0'); //TODO
  swap.poolTotalSwapFee = BigDecimal.fromString('0'); //TODO
  swap.poolLiquidity = BigDecimal.fromString('1000'); //TODO

  swap.timestamp = event.block.timestamp.toI32();
  swap.save();

  if (tokenAmountOut == BigDecimal.fromString('0') || tokenAmountIn == BigDecimal.fromString('0')) { return;}

  // Capture price
  let block = event.block.number;
  let pricing_assets: Address[] = [WETH, WBTC, USDC, DAI, BAL] 

  if (pricing_assets.includes(tokenInAddress)) {
    let tokenPriceId = getTokenPriceId(poolId.toHex(), tokenOutAddress, tokenInAddress, block)
    let tokenPrice = new TokenPrice(tokenPriceId);
    //tokenPrice.poolTokenId = getPoolTokenId(poolId, tokenOutAddress);
    tokenPrice.poolId = poolId.toHexString();
    tokenPrice.block = block;
    tokenPrice.asset = tokenOutAddress;
    tokenPrice.pricingAsset = tokenInAddress;
    // TODO decimals
    tokenPrice.price = tokenAmountIn.div(tokenAmountOut);
    tokenPrice.save();
  } else if (pricing_assets.includes(tokenOutAddress)) {
    let tokenPriceId = getTokenPriceId(poolId.toHex(), tokenInAddress, tokenOutAddress, block)
    let tokenPrice = new TokenPrice(tokenPriceId);
    //tokenPrice.poolTokenId = getPoolTokenId(poolId, tokenInAddress);
    tokenPrice.poolId = poolId.toHexString();
    tokenPrice.block = block;
    tokenPrice.asset = tokenInAddress;
    tokenPrice.pricingAsset = tokenOutAddress;
    // TODO decimals
    tokenPrice.price = tokenAmountOut.div(tokenAmountIn);
    tokenPrice.save();
  }
}

// Deprecated in favor of events
export function handleBatchSwapGivenIn(call: BatchSwapGivenInCall): void {
  let swaps = call.inputs.swaps;
  let tokens = call.inputs.tokens;
  let funds = call.inputs.funds;

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
    let amountIn = swapStruct.amountIn;

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

    swap.value = BigDecimal.fromString('100'); //TODO
    swap.feeValue = BigDecimal.fromString('1'); //TODO
    swap.protocolFeeValue = BigDecimal.fromString('0'); //TODO
    swap.poolTotalSwapVolume = BigDecimal.fromString('0'); //TODO
    swap.poolTotalSwapFee = BigDecimal.fromString('0'); //TODO
    swap.poolLiquidity = BigDecimal.fromString('1000'); //TODO
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
  let funds = call.inputs.funds;

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
    let amountOut = swapStruct.amountOut;

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
    swap.value = BigDecimal.fromString('100'); //TODO
    swap.feeValue = BigDecimal.fromString('1'); //TODO
    swap.protocolFeeValue = BigDecimal.fromString('0'); //TODO
    swap.poolTotalSwapVolume = BigDecimal.fromString('0'); //TODO
    swap.poolTotalSwapFee = BigDecimal.fromString('0'); //TODO
    swap.poolLiquidity = BigDecimal.fromString('1000'); //TODO
    swap.timestamp = call.block.timestamp.toI32();
    swap.save();

    let pool = Pool.load(poolId.toHex());
    pool.swapsCount = pool.swapsCount.plus(BigInt.fromI32(1));
    pool.save();
  }
}
