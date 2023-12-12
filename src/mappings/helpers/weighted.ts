import { Address, BigInt, Bytes, log } from '@graphprotocol/graph-ts';

import { Pool, GradualWeightUpdate } from '../../types/schema';

import { ZERO_BD, ONE, ZERO } from './constants';
import { scaleDown, loadPoolToken } from './misc';

class GradualValueChange {
  private calculateValueChangeProgress(startTimestamp: BigInt, endTimestamp: BigInt, blockTimestamp: BigInt): BigInt {
    if (blockTimestamp.ge(endTimestamp)) {
      return ONE;
    } else if (blockTimestamp.le(startTimestamp)) {
      return ZERO;
    } else {
      let totalSeconds: BigInt = endTimestamp.minus(startTimestamp);
      let secondsElapsed: BigInt = blockTimestamp.minus(startTimestamp);
      return secondsElapsed.div(totalSeconds);
    }
  }

  private interpolateValue(startValue: BigInt, endValue: BigInt, pctProgress: BigInt): BigInt {
    if (pctProgress.ge(ONE) || startValue == endValue) {
      return endValue;
    } else if (pctProgress == ZERO) {
      return startValue;
    } else if (startValue.gt(endValue)) {
      let delta: BigInt = pctProgress.times(startValue.minus(endValue));
      return startValue.minus(delta);
    } else {
      let delta: BigInt = pctProgress.times(endValue.minus(startValue));
      return startValue.plus(delta);
    }
  }

  public getInterpolateValue(
    startValue: BigInt,
    endValue: BigInt,
    startTimestamp: BigInt,
    endTimestamp: BigInt,
    blockTimestamp: BigInt
  ): BigInt {
    let pctProgress: BigInt = this.calculateValueChangeProgress(startTimestamp, endTimestamp, blockTimestamp);
    let currentWeight: BigInt = this.interpolateValue(startValue, endValue, pctProgress);
    return currentWeight;
  }
}

const Calc = new GradualValueChange();

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

  // let tokensList = pool.tokensList;

  let latestWeightUpdateId = pool.latestWeightUpdate;
  if (latestWeightUpdateId === null) {
    return;
  } else {
    // Load in the last GradualWeightUpdateScheduled event information
    let latestUpdate = GradualWeightUpdate.load(latestWeightUpdateId) as GradualWeightUpdate;

    let startWeights: BigInt[] = latestUpdate.startWeights;
    let endWeights: BigInt[] = latestUpdate.endWeights;
    let startTimestamp: BigInt = latestUpdate.startTimestamp;
    let endTimestamp: BigInt = latestUpdate.endTimestamp;
    //let x: string = "In else statement";
    //log.warning('Current info: (start: {}), (end: {}), (blocktime: {})', [startTimestamp.toString(), endTimestamp.toString(), blockTimestamp.toString()]);
    //log.warning('X: {}', [x])

    if (startWeights.length == tokensList.length) {
      let totalWeight = ZERO_BD;
      //log.warning('Passed into second if statement: {} {}', [changetype<string>(startWeights.length), changetype<string>(tokensList.length)]);

      for (let i = 0; i < tokensList.length; i++) {
        let tokenAddress = changetype<Address>(tokensList[i]);
        let weight = Calc.getInterpolateValue(
          startWeights[i],
          endWeights[i],
          startTimestamp,
          endTimestamp,
          blockTimestamp
        );

        let poolToken = loadPoolToken(poolId, tokenAddress);
        if (poolToken != null) {
          poolToken.weight = scaleDown(weight, 18);
          poolToken.save();
          //log.debug('Token weight has been saved: {}', [changetype<string>(weight)])
        }
        totalWeight = totalWeight.plus(scaleDown(weight, 18));
      }
      pool.totalWeight = totalWeight;
    }
  }
  pool.save();
}
