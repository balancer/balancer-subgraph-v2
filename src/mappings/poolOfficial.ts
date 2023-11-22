import { Pool } from '../types/schema';
import { OfficialPoolRegistered } from '../types/templates/OfficialPoolsRegister/OfficialPoolsRegister';
import { OfficialPoolDeregistered } from '../types/templates/OfficialPoolsRegister/OfficialPoolsRegister';

export function handleOfficialPoolRegistered(event: OfficialPoolRegistered): void {
  let poolId = event.params.poolId;
  let pool = Pool.load(poolId.toHexString()) as Pool;
  pool.officialPool = true;

  pool.save();
}

export function handleOfficialPoolDeregistered(event: OfficialPoolDeregistered): void {
  let poolId = event.params.poolId;
  let pool = Pool.load(poolId.toHexString()) as Pool;
  pool.officialPool = false;

  pool.save();
}
