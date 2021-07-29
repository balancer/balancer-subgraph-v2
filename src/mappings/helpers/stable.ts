import { BigInt } from '@graphprotocol/graph-ts';
import { StablePool } from '../../types/templates/StablePool/StablePool';
import { ZERO } from './constants';

// TODO: allow passing MetaStablePool once AS supports union types
export function getAmp(poolContract: StablePool): BigInt {
  let ampCall = poolContract.try_getAmplificationParameter();
  let amp = ZERO;
  if (!ampCall.reverted) {
    let value = ampCall.value.value0;
    let precision = ampCall.value.value2;
    amp = value.div(precision);
  }
  return amp;
}
