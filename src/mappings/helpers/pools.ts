import { Address } from '@graphprotocol/graph-ts';
import { Pool } from '../../types/schema';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace PoolType {
  export const Weighted = 'Weighted';
  export const Stable = 'Stable';
  export const MetaStable = 'MetaStable';
  export const Element = 'Element';
  export const LiquidityBootstrapping = 'LiquidityBootstrapping';
  export const Investment = 'Investment';
}

export function isVariableWeightPool(pool: Pool): boolean {
  return pool.poolType == PoolType.LiquidityBootstrapping || pool.poolType == PoolType.Investment;
}

export function isStableLikePool(pool: Pool): boolean {
  return pool.poolType == PoolType.Stable || pool.poolType == PoolType.MetaStable;
}

export function getPoolAddress(poolId: string): Address {
  return changetype<Address>(Address.fromHexString(poolId.slice(0, 42)));
}
