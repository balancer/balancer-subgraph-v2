import { BigDecimal, BigInt, Address, dataSource } from '@graphprotocol/graph-ts';

import { assets } from './assets';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ProtocolFeeType {
  export const Swap = 0;
  export const FlashLoan = 1;
  export const Yield = 2;
  export const Aum = 3;
}

export const ZERO = BigInt.fromI32(0);
export const ONE = BigInt.fromI32(1);
export const ZERO_BD = BigDecimal.fromString('0');
export const ONE_BD = BigDecimal.fromString('1');
export const SWAP_IN = 0;
export const SWAP_OUT = 1;

export const ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000');

export const MAX_TIME_DIFF_FOR_PRICING = BigInt.fromI32(600); // 10min

export let MAX_POS_PRICE_CHANGE = BigDecimal.fromString('1'); // +100%
export let MAX_NEG_PRICE_CHANGE = BigDecimal.fromString('-0.5'); // -50%%

export const MIN_POOL_LIQUIDITY = BigDecimal.fromString('2000');
export const MIN_SWAP_VALUE_USD = BigDecimal.fromString('0');

export let FX_AGGREGATOR_ADDRESSES = assets.fxAggregators;
export let FX_TOKEN_ADDRESSES = assets.fxAssets;

export let USD_STABLE_ASSETS = assets.stableAssets;
export let PRICING_ASSETS = assets.stableAssets.concat(assets.pricingAssets);

class AddressByNetwork {
  public canonical: string;
  public custom: string;
}

let network: string = dataSource.network();

// this list should be updated only if vault is deployed on a new chain
// with an address different than the standard vanity address
// in that case, AddressByNetwork and forNetwork must be updated accordingly
// with a new entry for the new network - folowwing subgraph slugs
let vaultAddressByNetwork: AddressByNetwork = {
  canonical: '0xFB43069f6d0473B85686a85F4Ce4Fc1FD8F00875',
  custom: '0x0000000000000000000000000000000000000000',
};

function forNetwork(addressByNetwork: AddressByNetwork, network: string): Address {
  if (network == 'custom') {
    return Address.fromString(addressByNetwork.custom);
  } else {
    return Address.fromString(addressByNetwork.canonical);
  }
}

export let VAULT_ADDRESS = forNetwork(vaultAddressByNetwork, network);
