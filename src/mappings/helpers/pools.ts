import { Address, Bytes, dataSource, log } from '@graphprotocol/graph-ts';
import { Pool, PriceRateProvider } from '../../types/schema';
import { Vault } from '../../types/Vault/Vault';
import { WeightedPoolV2 } from '../../types/WeightedPoolV2Factory/WeightedPoolV2';
import { setPriceRateProvider } from '../poolController';
import { VAULT_ADDRESS } from './constants';
import { bytesToAddress } from './misc';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace PoolType {
  export const Weighted = 'Weighted';
  export const Stable = 'Stable';
  export const MetaStable = 'MetaStable';
  export const Element = 'Element';
  export const LiquidityBootstrapping = 'LiquidityBootstrapping';
  export const Investment = 'Investment';
  export const StablePhantom = 'StablePhantom';
  export const ComposableStable = 'ComposableStable';
  export const HighAmpComposableStable = 'HighAmpComposableStable';
  export const AaveLinear = 'AaveLinear';
  export const ERC4626Linear = 'ERC4626Linear';
  export const Gyro2 = 'Gyro2';
  export const Gyro3 = 'Gyro3';
  export const GyroE = 'GyroE';
  export const FX = 'FX';
}

export function isVariableWeightPool(pool: Pool): boolean {
  return pool.poolType == PoolType.LiquidityBootstrapping || pool.poolType == PoolType.Investment;
}

export function hasVirtualSupply(pool: Pool): boolean {
  return (
    pool.poolType == PoolType.AaveLinear ||
    pool.poolType == PoolType.ERC4626Linear ||
    pool.poolType == PoolType.StablePhantom ||
    isComposableStablePool(pool)
  );
}

export function isComposableStablePool(pool: Pool): boolean {
  return pool.poolType == PoolType.ComposableStable || pool.poolType == PoolType.HighAmpComposableStable;
}

export function isLinearPool(pool: Pool): boolean {
  return pool.poolType == PoolType.AaveLinear || pool.poolType == PoolType.ERC4626Linear;
}

export function isStableLikePool(pool: Pool): boolean {
  return (
    pool.poolType == PoolType.Stable ||
    pool.poolType == PoolType.MetaStable ||
    pool.poolType == PoolType.StablePhantom ||
    isComposableStablePool(pool)
  );
}

export function isVerifiedRateProviderOfItself(pool: Pool): boolean {
  return (
    pool.poolType == PoolType.Weighted ||
    pool.poolType == PoolType.Stable ||
    pool.poolType == PoolType.MetaStable ||
    pool.poolType == PoolType.StablePhantom ||
    pool.poolType == PoolType.ComposableStable ||
    pool.poolType == PoolType.AaveLinear ||
    pool.poolType == PoolType.ERC4626Linear
  );
}

export function isFXPool(pool: Pool): boolean {
  return pool.poolType == PoolType.FX;
}

export function isMetaStableDeprecated(blockNumber: i32): boolean {
  let network = dataSource.network();

  if (network == 'ethereum' && blockNumber > 15008557) {
    return true;
  } else if (network == 'matic' && blockNumber > 35414865) {
    return true;
  } else {
    return false;
  }
}

export function getPoolAddress(poolId: string): Address {
  return changetype<Address>(Address.fromHexString(poolId.slice(0, 42)));
}

export function getPoolTokens(poolId: Bytes): Bytes[] | null {
  let vaultContract = Vault.bind(VAULT_ADDRESS);
  let tokensCall = vaultContract.try_getPoolTokens(poolId);

  if (tokensCall.reverted) {
    log.warning('Failed to get pool tokens: {}', [poolId.toHexString()]);
    return null;
  }

  let tokensValue = tokensCall.value.value0;
  let tokens = changetype<Bytes[]>(tokensValue);

  return tokens;
}

export function getPoolTokenManager(poolId: Bytes, tokenAddress: Bytes): Address | null {
  let token = changetype<Address>(tokenAddress);

  let vaultContract = Vault.bind(VAULT_ADDRESS);
  let managersCall = vaultContract.try_getPoolTokenInfo(poolId, token);

  if (managersCall.reverted) {
    log.warning('Failed to get pool token info: {} {}', [poolId.toHexString(), token.toHexString()]);
    return null;
  }

  let assetManager = managersCall.value.value3;

  return assetManager;
}

export function setPriceRateProviders(poolId: string, poolAddress: Address, tokensList: Bytes[]): void {
  let poolContract = WeightedPoolV2.bind(poolAddress);

  let rateProvidersCall = poolContract.try_getRateProviders();
  if (rateProvidersCall.reverted) return;

  let rateProviders = rateProvidersCall.value;
  if (rateProviders.length != tokensList.length) return;

  for (let i: i32 = 0; i < rateProviders.length; i++) {
    let tokenAddress = bytesToAddress(tokensList[i]);
    setPriceRateProvider(poolId, tokenAddress, rateProviders[i], -1, -1);
  }
}

export function _isSafeToSwapOn(pool: Pool, swapEnabled: boolean): boolean {
  if (!swapEnabled) return false;

  if (
    pool.poolType == PoolType.ComposableStable ||
    pool.poolType == PoolType.StablePhantom ||
    pool.poolType == PoolType.MetaStable
  ) {
    const rateProviders = pool.priceRateProviders;
    if (rateProviders) {
      for (let i: i32 = 0; i < rateProviders.length; i++) {
        const rp = PriceRateProvider.load(rateProviders[i]);
        if (rp == null) return false;
        if (!rp.isVerified) return false;
      }
    }
  } else if ((pool.poolType = PoolType.Stable)) {
    if (pool.poolTypeVersion == 1) return false;
  }
  return true;
}

export function isSafeToSwapOn(pool: Pool): boolean {
  return _isSafeToSwapOn(pool, pool.swapEnabled);
}

export function setSafeToSwapOn(poolId: string | null): void {
  if (poolId) {
    let pool = Pool.load(poolId);
    if (pool == null) return;
    pool.isSafeToSwapOn = isSafeToSwapOn(pool);
  }
}

export function updatePoolSwapEnabled(pool: Pool): void {
  if (pool.swapEnabled) return;

  pool.swapEnabled = true;
  pool.save();
}
