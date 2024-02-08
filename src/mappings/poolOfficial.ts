import { Pool } from '../types/schema';
import { OfficialPoolRegistered as OfficialPoolRegisteredEvent, OfficialPoolDeregistered as OfficialPoolDeregisteredEvent } from '../types/templates/OfficialPoolsRegister/OfficialPoolsRegister';
import { log } from '@graphprotocol/graph-ts'

export function handleOfficialPoolRegistered(event: OfficialPoolRegisteredEvent): void {
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

export function handleOfficialPoolDeregistered(event: OfficialPoolDeregisteredEvent): void {
  let poolId = event.params.poolId;

  let pool = Pool.load(poolId.toHexString()) as Pool;
  if (pool == null) {
    log.warning("There is no pool with id {}", [poolId.toHexString()]);
    return;
  }
  pool.officialPool = false;
  pool.officialPoolWeight = null;
  pool.save();
}
