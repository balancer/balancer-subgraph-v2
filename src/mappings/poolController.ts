import { BigInt, Address, Bytes, store } from '@graphprotocol/graph-ts';
import { LOG_CALL, LOG_JOIN, LOG_EXIT, LOG_SWAP, Transfer } from '../types/templates/Pool/Pool';
import { JoinPoolCall, ExitPoolCall } from '../types/templates/PoolController/FixedSetPoolTokenizer';
import { Balancer, Pool, PoolToken, PoolShare, Swap, TokenPrice, PoolTokenizer } from '../types/schema';
import {
  hexToDecimal,
  tokenToDecimal,
  createPoolShareEntity,
  createPoolTokenEntity,
  updatePoolLiquidity,
  ZERO_BD,
  decrPoolCount,
} from './helpers';

/************************************
 ********** Pool Controls ***********
 ************************************/

export function handleJoinPool(call: JoinPoolCall): void {
  let poolControllerAddress = call.to;
  let poolController = PoolTokenizer.load(poolControllerAddress.toHexString());

  poolController.joinsCount = poolController.joinsCount.plus(BigInt.fromI32(1));
  poolController.save();
}

export function handleExitPool(call: ExitPoolCall): void {
  let poolControllerAddress = call.to;
  let poolController = PoolTokenizer.load(poolControllerAddress.toHex());

  poolController.exitsCount = poolController.exitsCount.plus(BigInt.fromI32(1));
  poolController.save();
}

/************************************
 *********** POOL SHARES ************
 ************************************/

export function handleTransfer(event: Transfer): void {
  let poolTokenizerId = event.address.toHex();
  let poolAddress = event.address;

  let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  let isMint = event.params.src.toHex() == ZERO_ADDRESS;
  let isBurn = event.params.dst.toHex() == ZERO_ADDRESS;

  let poolShareFromId = poolTokenizerId.concat('-').concat(event.params.src.toHex());
  let poolShareFrom = PoolShare.load(poolShareFromId);
  let poolShareFromBalance = poolShareFrom == null ? ZERO_BD : poolShareFrom.balance;

  let poolShareToId = poolTokenizerId.concat('-').concat(event.params.dst.toHex());
  let poolShareTo = PoolShare.load(poolShareToId);
  let poolShareToBalance = poolShareTo == null ? ZERO_BD : poolShareTo.balance;

  let poolTokenizer = PoolTokenizer.load(poolTokenizerId);
  let pool = Pool.load(poolTokenizer.poolId);

  if (isMint) {
    if (poolShareTo == null) {
      createPoolShareEntity(poolAddress, event.params.dst);
      poolShareTo = PoolShare.load(poolShareToId);
    }
    poolShareTo.balance = poolShareTo.balance.plus(tokenToDecimal(event.params.amt, 18));
    poolShareTo.save();
    poolTokenizer.totalShares = poolTokenizer.totalShares.plus(tokenToDecimal(event.params.amt, 18));
  } else if (isBurn) {
    if (poolShareFrom == null) {
      createPoolShareEntity(poolAddress, event.params.src);
      poolShareFrom = PoolShare.load(poolShareFromId);
    }
    poolShareFrom.balance = poolShareFrom.balance.minus(tokenToDecimal(event.params.amt, 18));
    poolShareFrom.save();
    poolTokenizer.totalShares = poolTokenizer.totalShares.minus(tokenToDecimal(event.params.amt, 18));
  } else {
    if (poolShareTo == null) {
      createPoolShareEntity(poolAddress, event.params.dst);
      poolShareTo = PoolShare.load(poolShareToId);
    }
    poolShareTo.balance = poolShareTo.balance.plus(tokenToDecimal(event.params.amt, 18));
    poolShareTo.save();

    if (poolShareFrom == null) {
      createPoolShareEntity(poolAddress, event.params.src);
      poolShareFrom = PoolShare.load(poolShareFromId);
    }
    poolShareFrom.balance = poolShareFrom.balance.minus(tokenToDecimal(event.params.amt, 18));
    poolShareFrom.save();
  }

  if (poolShareTo !== null && poolShareTo.balance.notEqual(ZERO_BD) && poolShareToBalance.equals(ZERO_BD)) {
    poolTokenizer.holdersCount = poolTokenizer.holdersCount.plus(BigInt.fromI32(1));
  }

  if (poolShareFrom !== null && poolShareFrom.balance.equals(ZERO_BD) && poolShareFromBalance.notEqual(ZERO_BD)) {
    poolTokenizer.holdersCount = poolTokenizer.holdersCount.minus(BigInt.fromI32(1));
  }

  pool.save();
  poolTokenizer.save();
}
