import { BigInt, log } from '@graphprotocol/graph-ts';
import { AmpUpdate, Pool } from '../../types/schema';
import { ZERO, ONE } from './constants';

export const AMP_PRECISION = BigInt.fromI32(1000);

export function updateAmpFactor(pool: Pool, blockTimestamp: BigInt): void {
  let latestAmpUpdateId = pool.latestAmpUpdate;
  if (latestAmpUpdateId === null) return;

  let latestAmpUpdate = AmpUpdate.load(latestAmpUpdateId);
  if (!latestAmpUpdate) return;

  pool.amp = calculateAmpFactor(latestAmpUpdate, blockTimestamp);

  pool.save();
}

function calculateAmpFactor(latestAmpUpdate: AmpUpdate, blockTimestamp: BigInt): BigInt {
  let startValue = latestAmpUpdate.startAmp;
  let endValue = latestAmpUpdate.endAmp;
  let startTime = latestAmpUpdate.startTimestamp;
  let endTime = latestAmpUpdate.endTimestamp;

  let value = ZERO;
  if (blockTimestamp.lt(endTime)) {
    if (endValue.gt(startValue)) {
      value = startValue.plus(
        endValue.minus(startValue).times(blockTimestamp.minus(startTime)).div(endTime.minus(startTime))
      );
    } else {
      value = startValue.minus(
        startValue.minus(endValue).times(blockTimestamp.minus(startTime)).div(endTime.minus(startTime))
      );
    }
  } else {
    value = endValue;
  }

  return value;
}

export function calculateInvariant(amp: BigInt, balances: BigInt[], swapId: string): BigInt {
  let numTokens = balances.length;
  let sum = balances.reduce((a, b) => a.plus(b), ZERO);

  if (sum.isZero()) {
    return ZERO;
  }

  let prevInvariant: BigInt;
  let invariant = sum;
  let ampTimesTotal = amp.times(BigInt.fromI32(numTokens));

  for (let i = 0; i < 255; i++) {
    let D_P = invariant;

    for (let j = 0; j < numTokens; j++) {
      D_P = D_P.times(invariant).div(balances[j].times(BigInt.fromI32(numTokens)));
    }

    prevInvariant = invariant;

    invariant = invariant
      .times(
        ampTimesTotal
          .times(sum)
          .div(AMP_PRECISION)
          .plus(D_P.times(BigInt.fromI32(numTokens)))
      )
      .div(
        ampTimesTotal
          .minus(AMP_PRECISION)
          .times(invariant)
          .div(AMP_PRECISION)
          .plus(D_P.times(BigInt.fromI32(numTokens).plus(ONE)))
      );

    if (invariant.gt(prevInvariant)) {
      if (invariant.minus(prevInvariant).le(ONE)) {
        return invariant;
      }
    } else if (prevInvariant.minus(invariant).le(ONE)) {
      return invariant;
    }
  }

  log.error("Invariant didn't converge: {}", [swapId]);

  return invariant;
}
