import { Address, Bytes } from '@graphprotocol/graph-ts';

import { Pool } from '../../types/schema';
import { WeightedPool } from '../../types/templates/WeightedPool/WeightedPool';

import { ZERO_BD } from './constants';
import { scaleDown, loadPoolToken } from './misc';

export function updatePoolWeights(poolId: string): void {
  let pool = Pool.load(poolId);
  if (pool == null) return;

  const poolAddress = pool.address;
  let poolContract = WeightedPool.bind(changetype<Address>(poolAddress));

  let tokensList = new Array<Bytes>();
  for (let i = 0; i < pool.tokensList.length; i++) {
    let tokenAddress = pool.tokensList[i];
    if (tokenAddress != poolAddress) {
      tokensList.push(tokenAddress);
    }
  }

  let weightsCall = poolContract.try_getNormalizedWeights();
  if (!weightsCall.reverted) {
    let weights = weightsCall.value;

    if (weights.length == tokensList.length) {
      let totalWeight = ZERO_BD;

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
  }

  pool.save();
}
