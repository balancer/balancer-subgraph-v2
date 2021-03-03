import { BigInt, Address, Bytes, store } from '@graphprotocol/graph-ts';
import { Transfer } from '../types/templates/WeightedPool/BalancerPoolToken';
import { OnJoinPoolCall, OnExitPoolCall } from '../types/templates/WeightedPool/WeightedPool';
import { Balancer, Pool, PoolToken, PoolShare, Swap, PoolTokenizer } from '../types/schema';
import {
  hexToDecimal,
  tokenToDecimal,
  createPoolShareEntity,
  createPoolTokenEntity,
  getPoolShareId,
  decrPoolCount,
} from './helpers';
import {
  updatePoolLiquidity,
} from './pricing';
import {
  ZERO_ADDRESS,
  ZERO_BD,
} from './constants';

/************************************
 ********** Pool Controls ***********
 ************************************/

//export function handleJoinPool(call: OnJoinPoolCall): void {
  //let poolControllerAddress = call.to;
  //let poolController = PoolTokenizer.load(poolControllerAddress.toHexString());

  //poolController.joinsCount = poolController.joinsCount.plus(BigInt.fromI32(1));
  //poolController.save();
//}

//export function handleExitPool(call: OnExitPoolCall): void {
  //let poolControllerAddress = call.to;
  //let poolController = PoolTokenizer.load(poolControllerAddress.toHex());

  //poolController.exitsCount = poolController.exitsCount.plus(BigInt.fromI32(1));
  //poolController.save();
//}

/************************************
 *********** POOL SHARES ************
 ************************************/

export function handleTransfer(event: Transfer): void {
  let poolAddress = event.address;

  let isMint = event.params.from.toHex() == ZERO_ADDRESS;
  let isBurn = event.params.to.toHex() == ZERO_ADDRESS;

  let poolShareFromId = getPoolShareId(poolAddress, event.params.from)
  let poolShareFrom = PoolShare.load(poolShareFromId);
  let poolShareFromBalance = poolShareFrom == null ? ZERO_BD : poolShareFrom.balance;

  let poolShareToId = getPoolShareId(poolAddress, event.params.to)
  let poolShareTo = PoolShare.load(poolShareToId);
  let poolShareToBalance = poolShareTo == null ? ZERO_BD : poolShareTo.balance;

  let poolTokenizer = PoolTokenizer.load(poolAddress.toHexString());

  let BPT_DECIMALS = 18;

  if (isMint) {
    if (poolShareTo == null) {
      createPoolShareEntity(poolTokenizer!, event.params.to);
      poolShareTo = PoolShare.load(poolShareToId);
    }
    poolShareTo.balance = poolShareTo.balance.plus(tokenToDecimal(event.params.value, BPT_DECIMALS));
    poolShareTo.save();
    poolTokenizer.totalShares = poolTokenizer.totalShares.plus(tokenToDecimal(event.params.value, BPT_DECIMALS));
  } else if (isBurn) {
    if (poolShareFrom == null) {
      createPoolShareEntity(poolTokenizer!, event.params.from);
      poolShareFrom = PoolShare.load(poolShareFromId);
    }
    poolShareFrom.balance = poolShareFrom.balance.minus(tokenToDecimal(event.params.value, BPT_DECIMALS));
    poolShareFrom.save();
    poolTokenizer.totalShares = poolTokenizer.totalShares.minus(tokenToDecimal(event.params.value, BPT_DECIMALS));
  } else {
    if (poolShareTo == null) {
      createPoolShareEntity(poolTokenizer!, event.params.to);
      poolShareTo = PoolShare.load(poolShareToId);
    }
    poolShareTo.balance = poolShareTo.balance.plus(tokenToDecimal(event.params.value, BPT_DECIMALS));
    poolShareTo.save();

    if (poolShareFrom == null) {
      createPoolShareEntity(poolTokenizer!, event.params.from);
      poolShareFrom = PoolShare.load(poolShareFromId);
    }
    poolShareFrom.balance = poolShareFrom.balance.minus(tokenToDecimal(event.params.value, BPT_DECIMALS));
    poolShareFrom.save();
  }

  if (poolShareTo !== null && poolShareTo.balance.notEqual(ZERO_BD) && poolShareToBalance.equals(ZERO_BD)) {
    poolTokenizer.holdersCount = poolTokenizer.holdersCount.plus(BigInt.fromI32(1));
  }

  if (poolShareFrom !== null && poolShareFrom.balance.equals(ZERO_BD) && poolShareFromBalance.notEqual(ZERO_BD)) {
    poolTokenizer.holdersCount = poolTokenizer.holdersCount.minus(BigInt.fromI32(1));
  }

  poolTokenizer.save();
}
