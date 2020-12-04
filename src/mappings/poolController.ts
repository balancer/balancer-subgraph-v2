import { BigInt, Address, Bytes, store } from '@graphprotocol/graph-ts';
import { LOG_CALL, LOG_JOIN, LOG_EXIT, LOG_SWAP, Transfer } from '../types/templates/Pool/Pool';
import { Balancer, Pool, PoolToken, PoolShare, Swap, TokenPrice, PoolTokenizer } from '../types/schema';
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
  const poolTokenizer = PoolTokenizer.load(poolId);

  if (isMint) {
    if (poolShareTo == null) {
      createPoolShareEntity(poolShareToId, poolId, event.params.dst.toHex());
      poolShareTo = PoolShare.load(poolShareToId);
    }
    poolShareTo.balance = poolShareTo.balance + tokenToDecimal(event.params.amt.toBigDecimal(), 18);
    poolShareTo.save();
    poolTokenizer.totalShares += tokenToDecimal(event.params.amt.toBigDecimal(), 18);
  } else if (isBurn) {
    if (poolShareFrom == null) {
      createPoolShareEntity(poolShareFromId, poolId, event.params.src.toHex());
      poolShareFrom = PoolShare.load(poolShareFromId);
    }
    poolShareFrom.balance -= tokenToDecimal(event.params.amt.toBigDecimal(), 18);
    poolShareFrom.save();
    poolTokenizer.totalShares -= tokenToDecimal(event.params.amt.toBigDecimal(), 18);
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
    poolTokenizer.holdersCount += BigInt.fromI32(1);
  }

  if (poolShareFrom !== null && poolShareFrom.balance.equals(ZERO_BD) && poolShareFromBalance.notEqual(ZERO_BD)) {
    poolTokenizer.holdersCount -= BigInt.fromI32(1);
  }

  pool.save();
  poolTokenizer.save();
}
