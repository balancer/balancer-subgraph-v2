import { BigDecimal, BigInt, Address, dataSource } from '@graphprotocol/graph-ts';

import { assets } from './assets';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ProtocolFeeType {
  export const Swap = 0;
  export const FlashLoan = 1;
  export const Yield = 2;
  export const Aum = 3;
}

export let ZERO = BigInt.fromI32(0);
export let ZERO_BD = BigDecimal.fromString('0');
export let ONE_BD = BigDecimal.fromString('1');
export const SWAP_IN = 0;
export const SWAP_OUT = 1;

export let ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000');

export let MIN_POOL_LIQUIDITY = BigDecimal.fromString('2000');
export let MIN_SWAP_VALUE_USD = BigDecimal.fromString('1');

export let USD_STABLE_ASSETS = assets.stableAssets;
export let PRICING_ASSETS = assets.stableAssets.concat(assets.pricingAssets);

class AddressByNetwork {
  public mainnet: string;
  public goerli: string;
  public polygon: string;
  public arbitrum: string;
  public bnb: string;
  public dev: string;
}

let network: string = dataSource.network();

let vaultAddressByNetwork: AddressByNetwork = {
  mainnet: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  goerli: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  polygon: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  arbitrum: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  bnb: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  dev: '0xa0B05b20e511B1612E908dFCeE0E407E22B76028',
};

function forNetwork(addressByNetwork: AddressByNetwork, network: string): Address {
  if (network == 'mainnet') {
    return Address.fromString(addressByNetwork.mainnet);
  } else if (network == 'goerli') {
    return Address.fromString(addressByNetwork.goerli);
  } else if (network == 'matic') {
    return Address.fromString(addressByNetwork.polygon);
  } else if (network == 'arbitrum-one') {
    return Address.fromString(addressByNetwork.arbitrum);
  } else if (network == 'bsc') {
    return Address.fromString(addressByNetwork.bnb);
  } else {
    return Address.fromString(addressByNetwork.dev);
  }
}

export let VAULT_ADDRESS = forNetwork(vaultAddressByNetwork, network);

function fxAggregatorsForNetwork(network: string): string[] {
  if (network == 'mainnet') {
    return [
      '0x789190466E21a8b78b8027866CBBDc151542A26C', // USDC->USD aggregator
      '0xc96129C796F03bb21AC947EfC5329CD1F560305B', // XSGD->USD aggregator
      '0xDEc0a100eaD1fAa37407f0Edc76033426CF90b82', // DAI->USD aggregator
      '0x02F878A94a1AE1B15705aCD65b5519A46fe3517e', // EURS->USD aggregator
    ];
  } else if (network == 'matic') {
    return [
      '0xf9c53A834F60cBbE40E27702276fBc0819B3aFAD', // USDC->USD aggregator
      '0x45ede0Ea5cBbE380C663C7C3015Cc7c986669FEc', // XSGD->USD aggregator
      '0x62439095489Eb5dE4572de632248682c09a05Ad4', // DAI->USD aggregator
      '0x310990E8091b5cF083fA55F500F140CFBb959016', // EURS->USD aggregator
    ];
  } else {
    return [];
  }
}

export const FX_AGGREGATOR_ADDRESSES = fxAggregatorsForNetwork(network);

function fxTokensForNetwork(network: string): string[] {
  if (network == 'mainnet') {
    return [
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC token
      '0x70e8dE73cE538DA2bEEd35d14187F6959a8ecA96', // XSGD token
      '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI token
      '0xdB25f211AB05b1c97D595516F45794528a807ad8', // EURS token
    ];
  } else if (network == 'matic') {
    return [
      '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC token
      '0xDC3326e71D45186F113a2F448984CA0e8D201995', // XSGD token
      '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', // DAI token
      '0xE111178A87A3BFf0c8d18DECBa5798827539Ae99', // EURS token
    ];
  } else {
    return [];
  }
}

export const FX_TOKEN_ADDRESSES = fxTokensForNetwork(network);
