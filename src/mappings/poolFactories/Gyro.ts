import { Address } from '@graphprotocol/graph-ts';

import { PoolType, getPoolTokens } from '../helpers/pools';
import { handleNewPool, handleNewPoolTokens } from '../poolFactory';
import { scaleDown } from '../helpers/misc';

import { PoolCreated } from '../../types/Gyro2PoolFactory/Gyro2PoolFactory';
import { Gyro2Pool as Gyro2PoolTemplate } from '../../types/templates';
import { Gyro3Pool as Gyro3PoolTemplate } from '../../types/templates';
import { GyroEPool as GyroEPoolTemplate } from '../../types/templates';
import { Gyro2Pool } from '../../types/templates/Gyro2Pool/Gyro2Pool';
import { Gyro3Pool } from '../../types/templates/Gyro3Pool/Gyro3Pool';
import { GyroEPool } from '../../types/templates/GyroEPool/GyroEPool';

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

  handleNewPoolTokens(pool, tokens);

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

  handleNewPoolTokens(pool, tokens);

  Gyro3PoolTemplate.create(event.params.pool);
}

function createGyroEPool(event: PoolCreated, poolTypeVersion: i32 = 1): void {
  let poolAddress: Address = event.params.pool;
  let poolContract = GyroEPool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let swapFeeCall = poolContract.try_getSwapFeePercentage();
  let swapFee = swapFeeCall.value;

  let pool = handleNewPool(event, poolId, swapFee);

  pool.poolType = PoolType.GyroE;
  pool.poolTypeVersion = poolTypeVersion;
  let eParamsCall = poolContract.try_getECLPParams();

  if (!eParamsCall.reverted) {
    const params = eParamsCall.value.value0;
    const derived = eParamsCall.value.value1;
    pool.alpha = scaleDown(params.alpha, 18);
    pool.beta = scaleDown(params.beta, 18);
    pool.c = scaleDown(params.c, 18);
    pool.s = scaleDown(params.s, 18);
    pool.lambda = scaleDown(params.lambda, 18);

    // terms in the 'derived' object are stored in extra precision (38 decimals) with final decimal rounded down
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

  handleNewPoolTokens(pool, tokens);

  GyroEPoolTemplate.create(event.params.pool);
}

export function handleNewGyroEPool(event: PoolCreated): void {
  createGyroEPool(event);
}

export function handleNewGyroEV2Pool(event: PoolCreated): void {
  createGyroEPool(event, 2);
}
