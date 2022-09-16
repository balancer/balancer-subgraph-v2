import { ZERO_BD, ZERO } from './helpers/constants';
import { getPoolTokenManager, getPoolTokens, PoolType } from './helpers/pools';

import { newPoolEntity, createPoolTokenEntity, scaleDown, getBalancerSnapshot, tokenToDecimal } from './helpers/misc';
import { updatePoolWeights } from './helpers/weighted';

import { BigInt, Address, Bytes, BigDecimal } from '@graphprotocol/graph-ts';
import { PoolCreated } from '../types/WeightedPoolFactory/WeightedPoolFactory';
import { Balancer, Pool } from '../types/schema';

// datasource
import { WeightedPool as WeightedPoolTemplate } from '../types/templates';
import { WeightedPool2Tokens as WeightedPool2TokensTemplate } from '../types/templates';
import { StablePool as StablePoolTemplate } from '../types/templates';
import { MetaStablePool as MetaStablePoolTemplate } from '../types/templates';
import { StablePhantomPool as StablePhantomPoolTemplate } from '../types/templates';
import { StablePhantomPoolV2 as StablePhantomPoolV2Template } from '../types/templates';
import { ConvergentCurvePool as CCPoolTemplate } from '../types/templates';
import { LiquidityBootstrappingPool as LiquidityBootstrappingPoolTemplate } from '../types/templates';
import { InvestmentPool as InvestmentPoolTemplate } from '../types/templates';
import { LinearPool as LinearPoolTemplate } from '../types/templates';
import { Gyro2Pool as Gyro2PoolTemplate } from '../types/templates';
import { Gyro3Pool as Gyro3PoolTemplate } from '../types/templates';
import { GyroCEMMPool as GyroCEMMPoolTemplate } from '../types/templates';

import { WeightedPool } from '../types/templates/WeightedPool/WeightedPool';
import { StablePool } from '../types/templates/StablePool/StablePool';
import { ConvergentCurvePool } from '../types/templates/ConvergentCurvePool/ConvergentCurvePool';
import { LinearPool } from '../types/templates/LinearPool/LinearPool';
import { Gyro2Pool } from '../types/templates/Gyro2Pool/Gyro2Pool';
import { Gyro3Pool } from '../types/templates/Gyro3Pool/Gyro3Pool';
import { GyroCEMMPool } from '../types/templates/GyroCEMMPool/GyroCEMMPool';
import { ERC20 } from '../types/Vault/ERC20';

function createWeightedLikePool(event: PoolCreated, poolType: string): string | null {
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
  pool.owner = owner;

  let tokens = getPoolTokens(poolId);
  if (tokens == null) return null;
  pool.tokensList = tokens;

  pool.save();

  handleNewPoolTokens(poolId, tokens);

  // Load pool with initial weights
  updatePoolWeights(poolId.toHexString());

  return poolId.toHexString();
}

export function handleNewWeightedPool(event: PoolCreated): void {
  const pool = createWeightedLikePool(event, PoolType.Weighted);
  if (pool == null) return;
  WeightedPoolTemplate.create(event.params.pool);
}

export function handleNewWeighted2TokenPool(event: PoolCreated): void {
  createWeightedLikePool(event, PoolType.Weighted);
  WeightedPool2TokensTemplate.create(event.params.pool);
}

export function handleNewLiquidityBootstrappingPool(event: PoolCreated): void {
  const pool = createWeightedLikePool(event, PoolType.LiquidityBootstrapping);
  if (pool == null) return;
  LiquidityBootstrappingPoolTemplate.create(event.params.pool);
}

export function handleNewInvestmentPool(event: PoolCreated): void {
  const pool = createWeightedLikePool(event, PoolType.Investment);
  if (pool == null) return;
  InvestmentPoolTemplate.create(event.params.pool);
}

function createStableLikePool(event: PoolCreated, poolType: string): string | null {
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
  pool.owner = owner;

  let tokens = getPoolTokens(poolId);
  if (tokens == null) return null;
  pool.tokensList = tokens;

  pool.save();

  handleNewPoolTokens(poolId, tokens);

  return poolId.toHexString();
}

export function handleNewStablePool(event: PoolCreated): void {
  const pool = createStableLikePool(event, PoolType.Stable);
  if (pool == null) return;
  StablePoolTemplate.create(event.params.pool);
}

export function handleNewMetaStablePool(event: PoolCreated): void {
  const pool = createStableLikePool(event, PoolType.MetaStable);
  if (pool == null) return;
  MetaStablePoolTemplate.create(event.params.pool);
}

export function handleNewStablePhantomPool(event: PoolCreated): void {
  const pool = createStableLikePool(event, PoolType.StablePhantom);
  if (pool == null) return;
  StablePhantomPoolTemplate.create(event.params.pool);
}

export function handleNewStablePhantomPoolV2(event: PoolCreated): void {
  const pool = createStableLikePool(event, PoolType.ComposableStable);
  if (pool == null) return;
  StablePhantomPoolV2Template.create(event.params.pool);
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
  pool.poolType = PoolType.Element; // pool.owner = owner;
  pool.principalToken = principalToken;
  pool.baseToken = baseToken;
  pool.expiryTime = expiryTime;
  pool.unitSeconds = unitSeconds;

  let tokens = getPoolTokens(poolId);
  if (tokens == null) return;
  pool.tokensList = tokens;

  pool.save();

  handleNewPoolTokens(poolId, tokens);

  CCPoolTemplate.create(poolAddress);
}

export function handleNewAaveLinearPool(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.AaveLinear);
}

export function handleNewERC4626LinearPool(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.ERC4626Linear);
}

function handleNewLinearPool(event: PoolCreated, poolType: string): void {
  let poolAddress: Address = event.params.pool;

  let poolContract = LinearPool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let swapFeeCall = poolContract.try_getSwapFeePercentage();
  let swapFee = swapFeeCall.value;

  let pool = handleNewPool(event, poolId, swapFee);

  pool.poolType = poolType;
  let mainIndexCall = poolContract.try_getMainIndex();
  pool.mainIndex = mainIndexCall.value.toI32();
  let wrappedIndexCall = poolContract.try_getWrappedIndex();
  pool.wrappedIndex = wrappedIndexCall.value.toI32();

  let targetsCall = poolContract.try_getTargets();
  pool.lowerTarget = tokenToDecimal(targetsCall.value.value0, 18);
  pool.upperTarget = tokenToDecimal(targetsCall.value.value1, 18);

  let tokens = getPoolTokens(poolId);
  if (tokens == null) return;
  pool.tokensList = tokens;

  let maxTokenBalance = BigDecimal.fromString('5192296858534827.628530496329220095');
  pool.totalShares = pool.totalShares.minus(maxTokenBalance);
  pool.save();

  handleNewPoolTokens(poolId, tokens);

  LinearPoolTemplate.create(poolAddress);
}

export function handleNewGyro2Pool(event: PoolCreated): void {
  let poolAddress: Address = event.params.pool;

  let poolContract = Gyro2Pool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let swapFeeCall = poolContract.try_getSwapFeePercentage();
  let swapFee = swapFeeCall.value;

  let pool = handleNewPool(event, poolId, swapFee);

  pool.poolType = PoolType.Gyro2;
  let sqrtParamsCall = poolContract.try_getSqrtParameters();
  pool.sqrtAlpha = scaleDown(sqrtParamsCall.value[0], 18);
  pool.sqrtBeta = scaleDown(sqrtParamsCall.value[1], 18);

  let tokens = getPoolTokens(poolId);
  if (tokens == null) return;
  pool.tokensList = tokens;

  pool.save();

  handleNewPoolTokens(poolId, tokens);

  Gyro2PoolTemplate.create(event.params.pool);
}

export function handleNewGyro3Pool(event: PoolCreated): void {
  let poolAddress: Address = event.params.pool;

  let poolContract = Gyro3Pool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let swapFeeCall = poolContract.try_getSwapFeePercentage();
  let swapFee = swapFeeCall.value;

  let pool = handleNewPool(event, poolId, swapFee);

  pool.poolType = PoolType.Gyro3;
  let root3AlphaCall = poolContract.try_getRoot3Alpha();

  if (!root3AlphaCall.reverted) {
    pool.root3Alpha = scaleDown(root3AlphaCall.value, 18);
  }

  let tokens = getPoolTokens(poolId);
  if (tokens == null) return;
  pool.tokensList = tokens;

  pool.save();

  handleNewPoolTokens(poolId, tokens);

  Gyro3PoolTemplate.create(event.params.pool);
}

export function handleNewGyroCEMMPool(event: PoolCreated): void {
  let poolAddress: Address = event.params.pool;
  let poolContract = GyroCEMMPool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let swapFeeCall = poolContract.try_getSwapFeePercentage();
  let swapFee = swapFeeCall.value;

  let pool = handleNewPool(event, poolId, swapFee);

  pool.poolType = PoolType.GyroCEMM;
  let cemmParamsCall = poolContract.try_getCEMMParams();

  if (!cemmParamsCall.reverted) {
    const params = cemmParamsCall.value.value0;
    // terms in the 'derived' object are stored in extra precision (38 decimals) with final decimal rounded down
    const derived = cemmParamsCall.value.value1;
    pool.alpha = scaleDown(params.alpha, 18);
    pool.beta = scaleDown(params.beta, 18);
    pool.c = scaleDown(params.c, 18);
    pool.s = scaleDown(params.s, 18);
    pool.lambda = scaleDown(params.lambda, 18);

    pool.tauAlphaX = scaleDown(derived.tauAlpha.x, 38);
    pool.tauAlphaY = scaleDown(derived.tauAlpha.y, 38);
    pool.tauBetaX = scaleDown(derived.tauBeta.x, 38);
    pool.tauBetaY = scaleDown(derived.tauBeta.y, 38);
    pool.u = scaleDown(derived.u, 38);
    pool.v = scaleDown(derived.v, 38);
    pool.w = scaleDown(derived.w, 38);
    pool.z = scaleDown(derived.z, 38);
    pool.dSq = scaleDown(derived.dSq, 38);
  }

  let tokens = getPoolTokens(poolId);
  if (tokens == null) return;
  pool.tokensList = tokens;

  pool.save();

  handleNewPoolTokens(poolId, tokens);

  GyroCEMMPoolTemplate.create(event.params.pool);
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
    pool.factory = event.address;
    pool.oracleEnabled = false;
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

function handleNewPoolTokens(poolId: Bytes, tokens: Bytes[]): void {
  let tokensAddresses = changetype<Address[]>(tokens);

  for (let i: i32 = 0; i < tokens.length; i++) {
    let assetManager = getPoolTokenManager(poolId, tokens[i]);

    if (!assetManager) continue;

    createPoolTokenEntity(poolId.toHexString(), tokensAddresses[i], assetManager);
  }
}
