import { ZERO_BD } from './constants';
import { scaleDown, loadPoolToken } from './misc';

import { Pool } from '../../types/schema';
import { WeightedPool } from '../../types/templates/WeightedPool/WeightedPool';
import { Address } from '@graphprotocol/graph-ts';

export function updatePoolWeights(poolId: string): void {
  let pool = Pool.load(poolId);
  let poolContract = WeightedPool.bind(pool.address as Address);

  let tokensList = pool.tokensList;
  let weightsCall = poolContract.try_getNormalizedWeights();
  if (!weightsCall.reverted) {
    let weights = weightsCall.value;
    let totalWeight = ZERO_BD;

    for (let i: i32 = 0; i < tokensList.length; i++) {
      let tokenAddress = tokensList[i] as Address;
      let weight = weights[i];

      let poolToken = loadPoolToken(poolId, tokenAddress);
      poolToken.weight = scaleDown(weight, 18);
      poolToken.save();

      totalWeight = totalWeight.plus(scaleDown(weight, 18));
    }

    pool.totalWeight = totalWeight;
  }

  pool.save();
}
