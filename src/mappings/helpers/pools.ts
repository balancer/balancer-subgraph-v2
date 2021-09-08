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
