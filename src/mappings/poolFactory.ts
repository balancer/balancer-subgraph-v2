import {
  ZERO_BD,
} from './constants';
import { newPoolEntity } from './helpers'

import { BigInt, BigDecimal, Address, Bytes, store, ethereum } from '@graphprotocol/graph-ts';
import {
  PoolCreated
} from '../types/WeightedPoolFactory/WeightedPoolFactory';
import { Balancer, Pool, Swap, TokenPrice, User, UserBalance, PoolTokenizer } from '../types/schema';

// datasource
import { WeightedPool as WeightedPoolTemplate } from '../types/templates'
import { StablePool as StablePoolTemplate } from '../types/templates'

import { WeightedPool } from '../types/templates/WeightedPool/WeightedPool'
import { StablePool } from '../types/templates/StablePool/StablePool'

export function handleNewWeightedPool(event: PoolCreated): void {
  let poolAddress: Address = event.params.pool
  let poolContract = WeightedPool.bind(poolAddress)

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let swapFeeCall = poolContract.try_getSwapFee();
  let swapFee = swapFeeCall.value;

  handleNewPool(event, poolId, swapFee)
  WeightedPoolTemplate.create(poolAddress);
}

export function handleNewStablePool(event: PoolCreated): void {
  let poolAddress: Address = event.params.pool
  let poolContract = StablePool.bind(poolAddress)

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let swapFeeCall = poolContract.try_getSwapFee();
  let swapFee = swapFeeCall.value;

  handleNewPool(event, poolId, swapFee)
  StablePoolTemplate.create(poolAddress)
}

function findOrInitializeVault(): Balancer {
  let vault: Balancer | null = Balancer.load('2');
  if (vault !== null) return vault as Balancer;

  // if no vault yet, set up blank initial
  vault = new Balancer('2');
  vault.color = 'Silver';
  vault.poolCount = 0;
  vault.finalizedPoolCount = 0;
  vault.txCount = BigInt.fromI32(0);
  vault.totalLiquidity = ZERO_BD;
  vault.totalSwapVolume = ZERO_BD;
  vault.totalSwapFee = ZERO_BD;
  return vault as Balancer;
}

function handleNewPool(event: PoolCreated, poolId: Bytes, swapFee: BigInt): void {
  let vault = findOrInitializeVault();

  let poolAddress: Address = event.params.pool

  let pool = Pool.load(poolId.toHexString())
  if (pool == null) {
    pool = newPoolEntity(poolId.toHexString());

    pool.swapFee = swapFee.toBigDecimal();
    pool.createTime = event.block.timestamp.toI32();
    pool.controller = poolAddress;
    pool.tx = event.transaction.hash;

  }

  vault.poolCount = vault.poolCount + 1;
  vault.save();

  let poolTokenizer = new PoolTokenizer(poolAddress.toHexString());
  poolTokenizer.poolId = poolId.toHexString();
  poolTokenizer.totalShares = ZERO_BD;
  poolTokenizer.holdersCount = BigInt.fromI32(0);
  poolTokenizer.save();

  pool.poolTokenizer = poolAddress.toHexString();
  pool.save();
}
