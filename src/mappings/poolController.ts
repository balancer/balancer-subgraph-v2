import { BigInt, Address, Bytes, store } from '@graphprotocol/graph-ts';
import { LOG_CALL, LOG_JOIN, LOG_EXIT, LOG_SWAP, Transfer } from '../types/templates/Pool/Pool';
import { Balancer, Pool, PoolToken, PoolShare, Swap, TokenPrice } from '../types/schema';
import {
  hexToDecimal,
  tokenToDecimal,
  createPoolShareEntity,
  createPoolTokenEntity,
  updatePoolLiquidity,
  saveTransaction,
  ZERO_BD,
  decrPoolCount,
} from './helpers';

/************************************
 ********** Pool Controls ***********
 ************************************/
// TODO only applies to FixedSetPoolTokenizer

export function handleSetSwapFee(event: LOG_CALL): void {
  const poolId = event.address.toHex();
  const pool = Pool.load(poolId);
  const swapFee = hexToDecimal(event.params.data.toHexString().slice(-40), 18);
  pool.swapFee = swapFee;
  pool.save();

  saveTransaction(event, 'setSwapFee');
}

export function handleSetController(event: LOG_CALL): void {
  const poolId = event.address.toHex();
  const pool = Pool.load(poolId);
  const controller = Address.fromString(event.params.data.toHexString().slice(-40));
  pool.controller = controller;
  pool.save();

  saveTransaction(event, 'setController');
}

export function handleSetPublicSwap(event: LOG_CALL): void {
  const poolId = event.address.toHex();
  const pool = Pool.load(poolId);
  //let publicSwap = event.params.data.toHexString().slice(-1) == '1'
  //pool.publicSwap = publicSwap
  pool.save();

  saveTransaction(event, 'setPublicSwap');
}

export function handleRebind(event: LOG_CALL): void {
  const poolId = event.address.toHex();
  const pool = Pool.load(poolId);
  const tokenBytes = Bytes.fromHexString(event.params.data.toHexString().slice(34, 74)) as Bytes;
  const tokensList = pool.tokensList || [];
  if (tokensList.indexOf(tokenBytes) == -1) {
    tokensList.push(tokenBytes);
  }
  pool.tokensList = tokensList;
  pool.tokensCount = BigInt.fromI32(tokensList.length);

  const address = Address.fromString(event.params.data.toHexString().slice(34, 74));
  //const denormWeight = hexToDecimal(event.params.data.toHexString().slice(138), 18);

  const poolTokenId = poolId.concat('-').concat(address.toHexString());
  let poolToken = PoolToken.load(poolTokenId);
  if (poolToken == null) {
    createPoolTokenEntity(poolTokenId, poolId, address.toHexString());
    poolToken = PoolToken.load(poolTokenId);
    //pool.totalWeight += denormWeight
  } else {
    //let oldWeight = poolToken.denormWeight
    //if (denormWeight > oldWeight) {
    //pool.totalWeight = pool.totalWeight + (denormWeight - oldWeight)
    //} else {
    //pool.totalWeight = pool.totalWeight - (oldWeight - denormWeight)
    //}
  }

  const balance = hexToDecimal(event.params.data.toHexString().slice(74, 138), poolToken.decimals);

  poolToken.balance = balance;
  //poolToken.denormWeight = denormWeight
  poolToken.save();

  if (balance.equals(ZERO_BD)) {
    decrPoolCount(true);
    pool.active = false;
  }
  pool.save();

  updatePoolLiquidity(poolId);
  saveTransaction(event, 'rebind');
}

export function handleUnbind(event: LOG_CALL): void {
  const poolId = event.address.toHex();
  const pool = Pool.load(poolId);
  const tokenBytes = Bytes.fromHexString(event.params.data.toHexString().slice(-40)) as Bytes;
  const tokensList = pool.tokensList || [];
  const index = tokensList.indexOf(tokenBytes);
  tokensList.splice(index, 1);
  pool.tokensList = tokensList;
  pool.tokensCount = BigInt.fromI32(tokensList.length);

  const address = Address.fromString(event.params.data.toHexString().slice(-40));
  const poolTokenId = poolId.concat('-').concat(address.toHexString());
  //const poolToken = PoolToken.load(poolTokenId);
  //pool.totalWeight -= poolToken.denormWeight
  pool.save();
  store.remove('PoolToken', poolTokenId);

  saveTransaction(event, 'unbind');
}

/************************************
 ********** JOINS & EXITS ***********
 ************************************/

export function handleJoinPool(event: LOG_JOIN): void {
  const poolId = event.address.toHex();
  const pool = Pool.load(poolId);
  pool.joinsCount = pool.joinsCount + BigInt.fromI32(1);
  pool.save();

  const address = event.params.tokenIn.toHex();
  const poolTokenId = poolId.concat('-').concat(address.toString());
  const poolToken = PoolToken.load(poolTokenId);
  const tokenAmountIn = tokenToDecimal(event.params.tokenAmountIn.toBigDecimal(), poolToken.decimals);
  const newAmount = poolToken.balance.plus(tokenAmountIn);
  poolToken.balance = newAmount;
  poolToken.save();

  updatePoolLiquidity(poolId);
  saveTransaction(event, 'join');
}

export function handleExitPool(event: LOG_EXIT): void {
  const poolId = event.address.toHex();

  const address = event.params.tokenOut.toHex();
  const poolTokenId = poolId.concat('-').concat(address.toString());
  const poolToken = PoolToken.load(poolTokenId);
  const tokenAmountOut = tokenToDecimal(event.params.tokenAmountOut.toBigDecimal(), poolToken.decimals);
  const newAmount = poolToken.balance.minus(tokenAmountOut);
  poolToken.balance = newAmount;
  poolToken.save();

  const pool = Pool.load(poolId);
  pool.exitsCount = pool.exitsCount + BigInt.fromI32(1);
  if (newAmount.equals(ZERO_BD)) {
    decrPoolCount(true);
    pool.active = false;
  }
  pool.save();

  updatePoolLiquidity(poolId);
  saveTransaction(event, 'exit');
}

/************************************
 ************** SWAPS ***************
 ************************************/

export function handleSwap(event: LOG_SWAP): void {
  const poolId = event.address.toHex();

  const tokenIn = event.params.tokenIn.toHex();
  const poolTokenInId = poolId.concat('-').concat(tokenIn.toString());
  const poolTokenIn = PoolToken.load(poolTokenInId);
  const tokenAmountIn = tokenToDecimal(event.params.tokenAmountIn.toBigDecimal(), poolTokenIn.decimals);
  const newAmountIn = poolTokenIn.balance.plus(tokenAmountIn);
  poolTokenIn.balance = newAmountIn;
  poolTokenIn.save();

  const tokenOut = event.params.tokenOut.toHex();
  const poolTokenOutId = poolId.concat('-').concat(tokenOut.toString());
  const poolTokenOut = PoolToken.load(poolTokenOutId);
  const tokenAmountOut = tokenToDecimal(event.params.tokenAmountOut.toBigDecimal(), poolTokenOut.decimals);
  const newAmountOut = poolTokenOut.balance.minus(tokenAmountOut);
  poolTokenOut.balance = newAmountOut;
  poolTokenOut.save();

  updatePoolLiquidity(poolId);

  const swapId = event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString());
  let swap = Swap.load(swapId);
  if (swap == null) {
    swap = new Swap(swapId);
  }

  const pool = Pool.load(poolId);
  const tokensList: Array<Bytes> = pool.tokensList;
  let tokenOutPriceValue = ZERO_BD;
  const tokenOutPrice = TokenPrice.load(tokenOut);

  if (tokenOutPrice != null) {
    tokenOutPriceValue = tokenOutPrice.price;
  } else {
    for (let i: i32 = 0; i < tokensList.length; i++) {
      const tokenPriceId = tokensList[i].toHexString();
      if (!tokenOutPriceValue.gt(ZERO_BD) && tokenPriceId !== tokenOut) {
        const tokenPrice = TokenPrice.load(tokenPriceId);
        if (tokenPrice !== null && tokenPrice.price.gt(ZERO_BD)) {
          const poolTokenId = poolId.concat('-').concat(tokenPriceId);
          const poolToken = PoolToken.load(poolTokenId);
          tokenOutPriceValue = tokenPrice.price // TODO incorrect
            .times(poolToken.balance)
            //.div(poolToken.denormWeight)
            //.times(poolTokenOut.denormWeight)
            .div(poolTokenOut.balance);
        }
      }
    }
  }

  let totalSwapVolume = pool.totalSwapVolume;
  let totalSwapFee = pool.totalSwapFee;
  const liquidity = pool.liquidity;
  let swapValue = ZERO_BD;
  let swapFeeValue = ZERO_BD;

  if (tokenOutPriceValue.gt(ZERO_BD)) {
    swapValue = tokenOutPriceValue.times(tokenAmountOut);
    swapFeeValue = swapValue.times(pool.swapFee);
    totalSwapVolume = totalSwapVolume.plus(swapValue);
    totalSwapFee = totalSwapFee.plus(swapFeeValue);

    const factory = Balancer.load('1');
    factory.totalSwapVolume = factory.totalSwapVolume.plus(swapValue);
    factory.totalSwapFee = factory.totalSwapFee.plus(swapFeeValue);
    factory.save();

    pool.totalSwapVolume = totalSwapVolume;
    pool.totalSwapFee = totalSwapFee;
  }
  pool.swapsCount = pool.swapsCount + BigInt.fromI32(1);
  if (newAmountIn.equals(ZERO_BD) || newAmountOut.equals(ZERO_BD)) {
    decrPoolCount(true);
    pool.active = false;
  }
  pool.save();

  swap.caller = event.params.caller;
  swap.tokenIn = event.params.tokenIn;
  swap.tokenInSym = poolTokenIn.symbol;
  swap.tokenOut = event.params.tokenOut;
  swap.tokenOutSym = poolTokenOut.symbol;
  swap.tokenAmountIn = tokenAmountIn;
  swap.tokenAmountOut = tokenAmountOut;
  swap.poolAddress = event.address.toHex();
  swap.userAddress = event.transaction.from.toHex();
  swap.poolTotalSwapVolume = totalSwapVolume;
  swap.poolTotalSwapFee = totalSwapFee;
  swap.poolLiquidity = liquidity;
  swap.value = swapValue;
  swap.feeValue = swapFeeValue;
  swap.timestamp = event.block.timestamp.toI32();
  swap.save();

  saveTransaction(event, 'swap');
}

/************************************
 *********** POOL SHARES ************
 ************************************/

export function handleTransfer(event: Transfer): void {
  const poolId = event.address.toHex();

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  const isMint = event.params.src.toHex() == ZERO_ADDRESS;
  const isBurn = event.params.dst.toHex() == ZERO_ADDRESS;

  const poolShareFromId = poolId.concat('-').concat(event.params.src.toHex());
  let poolShareFrom = PoolShare.load(poolShareFromId);
  const poolShareFromBalance = poolShareFrom == null ? ZERO_BD : poolShareFrom.balance;

  const poolShareToId = poolId.concat('-').concat(event.params.dst.toHex());
  let poolShareTo = PoolShare.load(poolShareToId);
  const poolShareToBalance = poolShareTo == null ? ZERO_BD : poolShareTo.balance;

  const pool = Pool.load(poolId);

  if (isMint) {
    if (poolShareTo == null) {
      createPoolShareEntity(poolShareToId, poolId, event.params.dst.toHex());
      poolShareTo = PoolShare.load(poolShareToId);
    }
    poolShareTo.balance = poolShareTo.balance + tokenToDecimal(event.params.amt.toBigDecimal(), 18);
    poolShareTo.save();
    pool.totalShares += tokenToDecimal(event.params.amt.toBigDecimal(), 18);
  } else if (isBurn) {
    if (poolShareFrom == null) {
      createPoolShareEntity(poolShareFromId, poolId, event.params.src.toHex());
      poolShareFrom = PoolShare.load(poolShareFromId);
    }
    poolShareFrom.balance -= tokenToDecimal(event.params.amt.toBigDecimal(), 18);
    poolShareFrom.save();
    pool.totalShares -= tokenToDecimal(event.params.amt.toBigDecimal(), 18);
  } else {
    if (poolShareTo == null) {
      createPoolShareEntity(poolShareToId, poolId, event.params.dst.toHex());
      poolShareTo = PoolShare.load(poolShareToId);
    }
    poolShareTo.balance += tokenToDecimal(event.params.amt.toBigDecimal(), 18);
    poolShareTo.save();

    if (poolShareFrom == null) {
      createPoolShareEntity(poolShareFromId, poolId, event.params.src.toHex());
      poolShareFrom = PoolShare.load(poolShareFromId);
    }
    poolShareFrom.balance -= tokenToDecimal(event.params.amt.toBigDecimal(), 18);
    poolShareFrom.save();
  }

  if (poolShareTo !== null && poolShareTo.balance.notEqual(ZERO_BD) && poolShareToBalance.equals(ZERO_BD)) {
    pool.holdersCount += BigInt.fromI32(1);
  }

  if (poolShareFrom !== null && poolShareFrom.balance.equals(ZERO_BD) && poolShareFromBalance.notEqual(ZERO_BD)) {
    pool.holdersCount -= BigInt.fromI32(1);
  }

  pool.save();
}
