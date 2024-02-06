import { Pool } from '../types/schema';
import { OfficialPoolRegistered } from '../types/templates/OfficialPoolsRegister/OfficialPoolsRegister';
import { log } from '@graphprotocol/graph-ts'

export function handleOfficialPoolRegistered(event: OfficialPoolRegistered): void {
  let poolId = event.params.poolId;
  let weight = event.params.weight;

  let pool = Pool.load(poolId.toHexString()) as Pool;
  if (pool == null) {
    log.warning("There is no pool with id {}", [poolId.toHexString()]);
    return;
  }
  pool.officialPool = true;
  pool.officialPoolWeight = weight;

  pool.save();
}
