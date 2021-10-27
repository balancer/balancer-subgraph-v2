import { ZERO_BD, VAULT_ADDRESS, ZERO } from './helpers/constants';
import { PoolType } from './helpers/pools';

import { newPoolEntity, createPoolTokenEntity, scaleDown, getBalancerSnapshot } from './helpers/misc';
import { updatePoolWeights } from './helpers/weighted';

import { BigInt, Address, Bytes } from '@graphprotocol/graph-ts';
import { PoolCreated } from '../types/WeightedPoolFactory/WeightedPoolFactory';
import { Balancer, Pool } from '../types/schema';

// datasource
import { WeightedPool as WeightedPoolTemplate } from '../types/templates';
import { StablePool as StablePoolTemplate } from '../types/templates';
import { MetaStablePool as MetaStablePoolTemplate } from '../types/templates';
import { ConvergentCurvePool as CCPoolTemplate } from '../types/templates';
import { LiquidityBootstrappingPool as LiquidityBootstrappingPoolTemplate } from '../types/templates';
import { InvestmentPool as InvestmentPoolTemplate } from '../types/templates';

import { Vault } from '../types/Vault/Vault';
import { WeightedPool } from '../types/templates/WeightedPool/WeightedPool';
import { StablePool } from '../types/templates/StablePool/StablePool';
import { ConvergentCurvePool } from '../types/templates/ConvergentCurvePool/ConvergentCurvePool';
import { ERC20 } from '../types/Vault/ERC20';

function createWeightedLikePool(event: PoolCreated, poolType: string): string {
  let poolAddress: Address = event.params.pool;
  let poolContract = WeightedPool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let swapFeeCall = poolContract.try_getSwapFeePercentage();
  let swapFee = swapFeeCall.value;

  let ownerCall = poolContract.try_getOwner();
  let owner = ownerCall.value;

  let pool = handleNewPool(event, poolId, swapFee);
  pool.poolType = poolType;
  pool.factory = event.address;
  pool.owner = owner;

  let vaultContract = Vault.bind(VAULT_ADDRESS);
  let tokensCall = vaultContract.try_getPoolTokens(poolId);

  if (!tokensCall.reverted) {
    let tokens = tokensCall.value.value0;
    pool.tokensList = changetype<Bytes[]>(tokens);

    for (let i: i32 = 0; i < tokens.length; i++) {
      createPoolTokenEntity(poolId.toHexString(), tokens[i]);
    }
  }
  pool.save();

  // Load pool with initial weights
  updatePoolWeights(poolId.toHexString());

  return poolId.toHexString();
}

export function handleNewWeightedPool(event: PoolCreated): void {
  createWeightedLikePool(event, PoolType.Weighted);
  WeightedPoolTemplate.create(event.params.pool);
}

export function handleNewLiquidityBootstrappingPool(event: PoolCreated): void {
  createWeightedLikePool(event, PoolType.LiquidityBootstrapping);
  LiquidityBootstrappingPoolTemplate.create(event.params.pool);
}

export function handleNewInvestmentPool(event: PoolCreated): void {
  createWeightedLikePool(event, PoolType.Investment);
  InvestmentPoolTemplate.create(event.params.pool);
}

function createStableLikePool(event: PoolCreated, poolType: string): string {
  let poolAddress: Address = event.params.pool;
  let poolContract = StablePool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let swapFeeCall = poolContract.try_getSwapFeePercentage();
  let swapFee = swapFeeCall.value;

  let ownerCall = poolContract.try_getOwner();
  let owner = ownerCall.value;

  let pool = handleNewPool(event, poolId, swapFee);
  pool.poolType = poolType;
  pool.factory = event.address;
  pool.owner = owner;

  let vaultContract = Vault.bind(VAULT_ADDRESS);
  let tokensCall = vaultContract.try_getPoolTokens(poolId);

  if (!tokensCall.reverted) {
    let tokens = tokensCall.value.value0;
    pool.tokensList = changetype<Bytes[]>(tokens);

    for (let i: i32 = 0; i < tokens.length; i++) {
      createPoolTokenEntity(poolId.toHexString(), tokens[i]);
    }
  }

  pool.save();

  return poolId.toHexString();
}

export function handleNewStablePool(event: PoolCreated): void {
  createStableLikePool(event, PoolType.Stable);
  StablePoolTemplate.create(event.params.pool);
}

export function handleNewMetaStablePool(event: PoolCreated): void {
  createStableLikePool(event, PoolType.MetaStable);
  MetaStablePoolTemplate.create(event.params.pool);
}

export function handleNewCCPPool(event: PoolCreated): void {
  let poolAddress: Address = event.params.pool;

  let poolContract = ConvergentCurvePool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let swapFeeCall = poolContract.try_percentFee();
  let swapFee = swapFeeCall.value;

  let principalTokenCall = poolContract.try_bond();
  let principalToken = principalTokenCall.value;

  let baseTokenCall = poolContract.try_underlying();
  let baseToken = baseTokenCall.value;

  let expiryTimeCall = poolContract.try_expiration();
  let expiryTime = expiryTimeCall.value;

  let unitSecondsCall = poolContract.try_unitSeconds();
  let unitSeconds = unitSecondsCall.value;

  // let ownerCall = poolContract.try_getOwner();
  // let owner = ownerCall.value;

  let pool = handleNewPool(event, poolId, swapFee);
  pool.poolType = PoolType.Element;
  pool.factory = event.address;
  // pool.owner = owner;
  pool.principalToken = principalToken;
  pool.baseToken = baseToken;
  pool.expiryTime = expiryTime;
  pool.unitSeconds = unitSeconds;

  let vaultContract = Vault.bind(VAULT_ADDRESS);
  let tokensCall = vaultContract.try_getPoolTokens(poolId);

  if (!tokensCall.reverted) {
    let tokens = tokensCall.value.value0;
    pool.tokensList = changetype<Bytes[]>(tokens);

    for (let i: i32 = 0; i < tokens.length; i++) {
      createPoolTokenEntity(poolId.toHexString(), tokens[i]);
    }
  }
  pool.save();

  CCPoolTemplate.create(poolAddress);
}

function findOrInitializeVault(): Balancer {
  let vault: Balancer | null = Balancer.load('2');
  if (vault != null) return vault;

  // if no vault yet, set up blank initial
  vault = new Balancer('2');
  vault.poolCount = 0;
  vault.totalLiquidity = ZERO_BD;
  vault.totalSwapVolume = ZERO_BD;
  vault.totalSwapFee = ZERO_BD;
  vault.totalSwapCount = ZERO;
  return vault;
}

function handleNewPool(event: PoolCreated, poolId: Bytes, swapFee: BigInt): Pool {
  let poolAddress: Address = event.params.pool;

  let pool = Pool.load(poolId.toHexString());
  if (pool == null) {
    pool = newPoolEntity(poolId.toHexString());

    pool.swapFee = scaleDown(swapFee, 18);
    pool.createTime = event.block.timestamp.toI32();
    pool.address = poolAddress;
    pool.tx = event.transaction.hash;
    pool.swapEnabled = true;

    let bpt = ERC20.bind(poolAddress);

    let nameCall = bpt.try_name();
    if (!nameCall.reverted) {
      pool.name = nameCall.value;
    }

    let symbolCall = bpt.try_symbol();
    if (!symbolCall.reverted) {
      pool.symbol = symbolCall.value;
    }
    pool.save();

    let vault = findOrInitializeVault();
    vault.poolCount += 1;
    vault.save();

    let vaultSnapshot = getBalancerSnapshot(vault.id, event.block.timestamp.toI32());
    vaultSnapshot.poolCount += 1;
    vaultSnapshot.save();
  }

  return pool;
}
