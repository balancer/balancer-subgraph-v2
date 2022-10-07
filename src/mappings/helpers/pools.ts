import { Address, Bytes, log } from '@graphprotocol/graph-ts';
import { Pool, PriceRateProvider } from '../../types/schema';
import { Vault } from '../../types/Vault/Vault';
import { WeightedPoolV2 } from '../../types/WeightedPoolV2Factory/WeightedPoolV2';
import { VAULT_ADDRESS } from './constants';
import { bytesToAddress, getPoolTokenId } from './misc';

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
  export const AaveLinear = 'AaveLinear';
  export const ERC4626Linear = 'ERC4626Linear';
  export const Gyro2 = 'Gyro2';
  export const Gyro3 = 'Gyro3';
  export const GyroCEMM = 'GyroCEMM';
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
    pool.poolType == PoolType.ComposableStable
  );
}

export function isComposablePool(pool: Pool): boolean {
  return pool.poolType == PoolType.ComposableStable;
}

export function isLinearPool(pool: Pool): boolean {
  return pool.poolType == PoolType.AaveLinear || pool.poolType == PoolType.ERC4626Linear;
}

export function isStableLikePool(pool: Pool): boolean {
  return (
    pool.poolType == PoolType.Stable ||
    pool.poolType == PoolType.MetaStable ||
    pool.poolType == PoolType.StablePhantom ||
    pool.poolType == PoolType.ComposableStable
  );
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
    let providerId = getPoolTokenId(poolId, tokenAddress);
    let provider = new PriceRateProvider(providerId);
    provider.poolId = poolId;
    provider.token = providerId;
    provider.address = rateProviders[i];
    provider.save();
  }
}
