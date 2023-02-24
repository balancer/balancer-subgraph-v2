import { BigInt } from '@graphprotocol/graph-ts';
import { ZERO, ONE } from './constants';

export function divUp(a: BigInt, b: BigInt): BigInt {
  if (a.isZero()) {
    return ZERO;
  } else {
    return ONE.plus(a.minus(ONE).div(b));
  }
}
