import { Address, Bytes, dataSource, log } from '@graphprotocol/graph-ts';
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

export function isFXPool(pool: Pool): boolean {
  return pool.poolType == PoolType.FX;
}

export function isMetaStableDeprecated(blockNumber: i32): boolean {
  let network = dataSource.network();

  if (network == 'ethereum' && blockNumber > 15008557 && blockNumber < 16380140) {
    // Between blocks 15008557 and 16380140 metastable was considered deprecated because subject to faulty rate providers.
    // But due to recent issues with composable stable pools we decided to start creating pools with it again.
    // This conditional prevents pools created between those blocks from being indexed,
    // because we know pools with faulty rate providers were created then
    return true;
  } else if (network == 'matic' && blockNumber > 35414865 && blockNumber < 37921111) {
    // Between blocks 35414865 and 37921111 metastable was considered deprecated because subject to faulty rate providers
    // But due to recent issues with composable stable pools we decided to start creating pools with it again
    // This conditional prevents pools created between those blocks from being indexed,
    // because we know pools with faulty rate providers were created then
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
    let providerId = getPoolTokenId(poolId, tokenAddress);
    let provider = new PriceRateProvider(providerId);
    provider.poolId = poolId;
    provider.token = providerId;
    provider.address = rateProviders[i];
    provider.save();
  }
}
