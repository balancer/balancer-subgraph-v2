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
  export const StablePhantom = 'StablePhantom';
  export const AaveLinear = 'AaveLinear';
  export const ERC4626Linear = 'ERC4626Linear';
  export const Linear = 'AaveLinear';
  export const Gyro2 = 'Gyro2';
  export const Gyro3 = 'Gyro3';
}

export function isVariableWeightPool(pool: Pool): boolean {
  return pool.poolType == PoolType.LiquidityBootstrapping || pool.poolType == PoolType.Investment;
}

export function hasVirtualSupply(pool: Pool): boolean {
  return (
    pool.poolType == PoolType.AaveLinear ||
    pool.poolType == PoolType.ERC4626Linear ||
    pool.poolType == PoolType.StablePhantom
  );
}

export function isStableLikePool(pool: Pool): boolean {
  return (
    pool.poolType == PoolType.Stable || pool.poolType == PoolType.MetaStable || pool.poolType == PoolType.StablePhantom
  );
}

export function getPoolAddress(poolId: string): Address {
  return changetype<Address>(Address.fromHexString(poolId.slice(0, 42)));
}
