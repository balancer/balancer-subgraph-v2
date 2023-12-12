import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts';

import { Pool, GradualWeightUpdate } from '../../types/schema';
import { WeightedPool } from '../../types/templates/WeightedPool/WeightedPool';

import { ZERO_BD, ZERO } from './constants';
import { scaleDown, loadPoolToken } from './misc';

export function updatePoolWeights(poolId: string, blockTimestamp: BigInt): void {
  let pool = Pool.load(poolId);
  if (pool == null) return;

  const poolAddress = pool.address;
  let tokensList = new Array<Bytes>();
  for (let i = 0; i < pool.tokensList.length; i++) {
    let tokenAddress = pool.tokensList[i];
    if (tokenAddress != poolAddress) {
      tokensList.push(tokenAddress);
    }
  }

  let latestWeightUpdateId = pool.latestWeightUpdate;
  let weights: BigInt[] = [];
  let latestUpdate: GradualWeightUpdate = null;

  if (!latestWeightUpdateId) {
    let poolContract = WeightedPool.bind(changetype<Address>(pool.address));
    let weightsCall = poolContract.try_getNormalizedWeights();
    weights = weightsCall.value;
  } else {
      latestUpdate = GradualWeightUpdate.load(latestWeightUpdateId) as GradualWeightUpdate;
  }

  if (latestUpdate.startWeights.length == tokensList.length || weights.length == tokensList.length) {
    let totalWeight = ZERO_BD;

    for (let i = 0; i < tokensList.length; i++) {
      let tokenAddress = changetype<Address>(tokensList[i]);
      let weight = ZERO;
      if (!latestWeightUpdateId) {
        weight = weights[i];
      } else {
        weight = calculateCurrentWeight(
          latestUpdate.startWeights[i],
          latestUpdate.endWeights[i],
          latestUpdate.startTimestamp,
          latestUpdate.endTimestamp,
          blockTimestamp
        );
      }

      let poolToken = loadPoolToken(poolId, tokenAddress);
      if (poolToken != null) {
        poolToken.weight = scaleDown(weight, 18);
        poolToken.save();
      }
      totalWeight = totalWeight.plus(scaleDown(weight, 18));
    }
    pool.totalWeight = totalWeight;
  }
  pool.save();
}

function calculateCurrentWeight(
  startWeight: BigInt,
  endWeight: BigInt,
  startTimestamp: BigInt,
  endTimestamp: BigInt,
  blockTimestamp: BigInt
): BigInt {
  let pctProgress: BigInt = ZERO;
  let delta: BigInt = ZERO;

  if (blockTimestamp.ge(endTimestamp) || startWeight == endWeight) {
    return endWeight;
  } else if (blockTimestamp.le(startTimestamp)) {
    return startWeight;
  } else {
    const totalSeconds: BigInt = endTimestamp.minus(startTimestamp);
    const secondsElapsed: BigInt = blockTimestamp.minus(startTimestamp);
    pctProgress = secondsElapsed.div(totalSeconds);
    if (startWeight.gt(endWeight)) {
      delta = pctProgress.times(startWeight.minus(endWeight));
      return startWeight.minus(delta);
    } else {
      delta = pctProgress.times(endWeight.minus(startWeight));
      return startWeight.plus(delta);
    }
  }
}
