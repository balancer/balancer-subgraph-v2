import {
  ZERO_BD,
} from './constants';
import { newPoolEntity } from './helpers'

import { BigInt, BigDecimal, Address, Bytes, store } from '@graphprotocol/graph-ts';
import {
  PoolCreated
} from '../types/WeightedPoolFactory/WeightedPoolFactory';
import { Balancer, Pool, PoolToken, Swap, TokenPrice, User, UserBalance, PoolTokenizer, Investment } from '../types/schema';

// datasource
import { WeightedPool as WeightedPoolTemplate } from '../types/templates'
import { StablePool as StablePoolTemplate } from '../types/templates'

import { WeightedPool } from '../types/templates/WeightedPool/WeightedPool'

export function handleNewPool(event: PoolCreated): void {
  let vault = Balancer.load('2');

  // if no vault yet, set up blank initial
  if (vault == null) {
    vault = new Balancer('2');
    vault.color = 'Silver';
    vault.poolCount = 0;
    vault.finalizedPoolCount = 0;
    vault.txCount = BigInt.fromI32(0);
    vault.totalLiquidity = ZERO_BD;
    vault.totalSwapVolume = ZERO_BD;
    vault.totalSwapFee = ZERO_BD;
  }

  let poolAddress = event.params.pool
  let poolContract = WeightedPool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let pool = Pool.load(poolId.toHexString())
  if (pool == null) {
    pool = newPoolEntity(poolId.toHexString());

    let swapFeeCall = poolContract.try_getSwapFee();
    let swapFee = swapFeeCall.value;

    pool.swapFee = swapFee.toBigDecimal();
    pool.createTime = event.block.timestamp.toI32();
    pool.controller = poolAddress;
    pool.tx = event.transaction.hash;

    pool.save();
  }

  vault.poolCount = vault.poolCount + 1;
  vault.save();

  let poolTokenizer = new PoolTokenizer(poolAddress.toHexString());
  poolTokenizer.poolId = poolId.toHexString();
  poolTokenizer.totalShares = ZERO_BD;
  poolTokenizer.holdersCount = BigInt.fromI32(0);
  poolTokenizer.joinsCount = BigInt.fromI32(0);
  poolTokenizer.exitsCount = BigInt.fromI32(0);
  poolTokenizer.save();


  // start receiving events
  WeightedPoolTemplate.create(poolAddress);
}


