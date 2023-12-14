import { Address, BigInt, Bytes, BigDecimal } from '@graphprotocol/graph-ts';

import { Pool, GradualWeightUpdate } from '../../types/schema';
import { WeightedPool } from '../../types/templates/WeightedPool/WeightedPool';

import { ZERO_BD } from './constants';
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
  let totalWeight = ZERO_BD;

  if (latestWeightUpdateId === null) {
    let poolContract = WeightedPool.bind(changetype<Address>(pool.address));
    let weightsCall = poolContract.try_getNormalizedWeights();
    let weights = weightsCall.value;
    if (weights.length == tokensList.length) {
      for (let i = 0; i < tokensList.length; i++) {
        let tokenAddress = changetype<Address>(tokensList[i]);
        let weight = weights[i];
        let poolToken = loadPoolToken(poolId, tokenAddress);
        if (poolToken != null) {
          poolToken.weight = scaleDown(weight, 18);
          poolToken.save();
        }
        totalWeight = totalWeight.plus(scaleDown(weight, 18));
      }
      pool.totalWeight = totalWeight;
    }
  } else {
    let latestUpdate = GradualWeightUpdate.load(latestWeightUpdateId) as GradualWeightUpdate;
    if (latestUpdate.startWeights.length == tokensList.length) {
      for (let i = 0; i < tokensList.length; i++) {
        let tokenAddress = changetype<Address>(tokensList[i]);
        let weight = calculateCurrentWeight(
          latestUpdate.startWeights[i],
          latestUpdate.endWeights[i],
          latestUpdate.startTimestamp,
          latestUpdate.endTimestamp,
          blockTimestamp
        );
        let poolToken = loadPoolToken(poolId, tokenAddress);
        if (poolToken != null) {
          poolToken.weight = weight;
          poolToken.save();
        }
        totalWeight = totalWeight.plus(weight);
      }
      pool.totalWeight = totalWeight;
    }
  }
  pool.save();
}

function calculateCurrentWeight(
  startWeight: BigInt,
  endWeight: BigInt,
  startTimestamp: BigInt,
  endTimestamp: BigInt,
  blockTimestamp: BigInt
): BigDecimal {
  const scalar: BigDecimal = BigDecimal.fromString('1000000000000000000');

  if (blockTimestamp.ge(endTimestamp) || startWeight == endWeight) {
    return endWeight.toBigDecimal() / scalar;
  } else if (blockTimestamp.le(startTimestamp)) {
    return startWeight.toBigDecimal() / scalar;
  } else {
    const duration: BigInt = endTimestamp.minus(startTimestamp);
    const elapsedTime: BigInt = blockTimestamp.minus(startTimestamp);
    const pctProgress: BigDecimal = elapsedTime.toBigDecimal() / duration.toBigDecimal();

    if (startWeight.gt(endWeight)) {
      let delta = pctProgress * (startWeight - endWeight).toBigDecimal();
      return (startWeight.toBigDecimal() - delta) / scalar;
    } else {
      let delta = pctProgress * (endWeight - startWeight).toBigDecimal();
      return (startWeight.toBigDecimal() + delta) / scalar;
    }
  }
}
