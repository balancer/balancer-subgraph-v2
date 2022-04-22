import { BigDecimal, BigInt, Address, dataSource } from '@graphprotocol/graph-ts';

export let ZERO = BigInt.fromI32(0);
export let ZERO_BD = BigDecimal.fromString('0');
export let ONE_BD = BigDecimal.fromString('1');
export const SWAP_IN = 0;
export const SWAP_OUT = 1;

export let ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000');

export let MIN_POOL_LIQUIDITY = BigDecimal.fromString('10');

export class AddressByNetwork {
  public mainnet: string;
  public kovan: string;
  public goerli: string;
  public rinkeby: string;
  public polygon: string;
  public arbitrum: string;
  public dev: string;
}

let network: string = dataSource.network();

let vaultAddressByNetwork: AddressByNetwork = {
  mainnet: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  kovan: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  goerli: '0x65748E8287Ce4B9E6D83EE853431958851550311',
  rinkeby: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  polygon: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  arbitrum: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  dev: '0xa0B05b20e511B1612E908dFCeE0E407E22B76028',
};

let wethAddressByNetwork: AddressByNetwork = {
  mainnet: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  kovan: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
  goerli: '0x9A1000D492d40bfccbc03f413A48F5B6516Ec0Fd',
  rinkeby: '0xdFCeA9088c8A88A76FF74892C1457C17dfeef9C1',
  polygon: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
  arbitrum: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  dev: '0x4CDDb3505Cf09ee0Fa0877061eB654839959B9cd',
};

let wMaticAddressByNetwork: AddressByNetwork = {
  mainnet: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
  kovan: '0x0000000000000000000000000000000000000000',
  goerli: '0x0000000000000000000000000000000000000000',
  rinkeby: '0x0000000000000000000000000000000000000000',
  polygon: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  arbitrum: '0x0000000000000000000000000000000000000000',
  dev: '0x0000000000000000000000000000000000000000',
};

let wbtcAddressByNetwork: AddressByNetwork = {
  mainnet: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  kovan: '0x1C8E3Bcb3378a443CC591f154c5CE0EBb4dA9648',
  goerli: '0x78dEca24CBa286C0f8d56370f5406B48cFCE2f86',
  rinkeby: '0xc3dbf84Abb494ce5199D5d4D815b10EC29529ff8',
  polygon: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
  arbitrum: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
  dev: '0xcD80986f08d776CE41698c47f705CDc99dDBfB0A',
};

let usdAddressByNetwork: AddressByNetwork = {
  mainnet: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  kovan: '0xc2569dd7d0fd715B054fBf16E75B001E5c0C1115',
  goerli: '0x78dEca24CBa286C0f8d56370f5406B48cFCE2f86',
  rinkeby: '0xc3dbf84Abb494ce5199D5d4D815b10EC29529ff8',
  polygon: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
  arbitrum: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
  dev: '0x1528f3fcc26d13f7079325fb78d9442607781c8c',
};

let usdcAddressByNetwork: AddressByNetwork = {
  mainnet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  kovan: '0xc2569dd7d0fd715B054fBf16E75B001E5c0C1115',
  goerli: '0x78dEca24CBa286C0f8d56370f5406B48cFCE2f86',
  rinkeby: '0xc3dbf84Abb494ce5199D5d4D815b10EC29529ff8',
  polygon: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
  arbitrum: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
  dev: '0x7c0c5AdA758cf764EcD6bAC05b63b2482f90bBB2',
};

let usdtAddressByNetwork: AddressByNetwork = {
  mainnet: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  kovan: '0xcC08220af469192C53295fDd34CFb8DF29aa17AB',
  goerli: '0x78dEca24CBa286C0f8d56370f5406B48cFCE2f86',
  rinkeby: '0xc3dbf84Abb494ce5199D5d4D815b10EC29529ff8',
  polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  dev: '0x7c0c5AdA758cf764EcD6bAC05b63b2482f90bBB2',
};

let balAddressByNetwork: AddressByNetwork = {
  mainnet: '0xba100000625a3754423978a60c9317c58a424e3D',
  kovan: '0x41286Bb1D3E870f3F750eB7E1C25d7E48c8A1Ac7',
  goerli: '0x78dEca24CBa286C0f8d56370f5406B48cFCE2f86',
  rinkeby: '0xc3dbf84Abb494ce5199D5d4D815b10EC29529ff8',
  polygon: '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3',
  arbitrum: '0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8',
  dev: '0xf702269193081364E355f862f2CFbFCdC5DB738C',
};

let daiAddressByNetwork: AddressByNetwork = {
  mainnet: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  kovan: '0x04DF6e4121c27713ED22341E7c7Df330F56f289B',
  goerli: '0x78dEca24CBa286C0f8d56370f5406B48cFCE2f86',
  rinkeby: '0xc3dbf84Abb494ce5199D5d4D815b10EC29529ff8',
  polygon: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
  arbitrum: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  dev: '0x5C0E66606eAbEC1df45E2ADd26C5DF8C0895a397',
};

let altDaiAddressByNetwork: AddressByNetwork = {
  mainnet: '0x0000000000000000000000000000000000000000',
  kovan: '0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD',
  goerli: '0x0000000000000000000000000000000000000000',
  rinkeby: '0x0000000000000000000000000000000000000000',
  polygon: '0x0000000000000000000000000000000000000000',
  arbitrum: '0x0000000000000000000000000000000000000000',
  dev: '0x0000000000000000000000000000000000000000',
};

let altUsdcAddressByNetwork: AddressByNetwork = {
  mainnet: '0x0000000000000000000000000000000000000000',
  kovan: '0xe22da380ee6B445bb8273C81944ADEB6E8450422',
  goerli: '0x0000000000000000000000000000000000000000',
  rinkeby: '0x0000000000000000000000000000000000000000',
  polygon: '0x0000000000000000000000000000000000000000',
  arbitrum: '0x0000000000000000000000000000000000000000',
  dev: '0x0000000000000000000000000000000000000000',
};

let altUsdtAddressByNetwork: AddressByNetwork = {
  mainnet: '0x0000000000000000000000000000000000000000',
  kovan: '0x13512979ADE267AB5100878E2e0f485B568328a4',
  goerli: '0x0000000000000000000000000000000000000000',
  rinkeby: '0x0000000000000000000000000000000000000000',
  polygon: '0x0000000000000000000000000000000000000000',
  arbitrum: '0x0000000000000000000000000000000000000000',
  dev: '0x0000000000000000000000000000000000000000',
};

let linearDaiAddressByNetwork: AddressByNetwork = {
  mainnet: '0x804CdB9116a10bB78768D3252355a1b18067bF8f',
  kovan: '0xfcccb77a946b6a3bd59d149f083b5bfbb8004d6d',
  goerli: '0x0000000000000000000000000000000000000000',
  rinkeby: '0x0000000000000000000000000000000000000000',
  polygon: '0x0000000000000000000000000000000000000000',
  arbitrum: '0x0000000000000000000000000000000000000000',
  dev: '0x0000000000000000000000000000000000000000',
};

let linearUsdcAddressByNetwork: AddressByNetwork = {
  mainnet: '0x9210F1204b5a24742Eba12f710636D76240dF3d0',
  kovan: '0x0bbd32b14a6503ee20f87df38cf2d5d3b59ea2f5',
  goerli: '0x0000000000000000000000000000000000000000',
  rinkeby: '0x0000000000000000000000000000000000000000',
  polygon: '0x0000000000000000000000000000000000000000',
  arbitrum: '0x0000000000000000000000000000000000000000',
  dev: '0x0000000000000000000000000000000000000000',
};

let linearUsdtAddressByNetwork: AddressByNetwork = {
  mainnet: '0x2BBf681cC4eb09218BEe85EA2a5d3D13Fa40fC0C',
  kovan: '0xe667d48618e71c2a02e4a1b66ed9def1426938b6',
  goerli: '0x0000000000000000000000000000000000000000',
  rinkeby: '0x0000000000000000000000000000000000000000',
  polygon: '0x0000000000000000000000000000000000000000',
  arbitrum: '0x0000000000000000000000000000000000000000',
  dev: '0x0000000000000000000000000000000000000000',
};

let mkrAddressByNetwork: AddressByNetwork = {
  mainnet: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
  kovan: '0x0000000000000000000000000000000000000000',
  goerli: '0x0000000000000000000000000000000000000000',
  rinkeby: '0x0000000000000000000000000000000000000000',
  polygon: '0x6f7C932e7684666C9fd1d44527765433e01fF61d',
  arbitrum: '0x0000000000000000000000000000000000000000',
  dev: '0x0000000000000000000000000000000000000000',
};

let gnoAddressByNetwork: AddressByNetwork = {
  mainnet: '0x6810e776880C02933D47DB1b9fc05908e5386b96',
  kovan: '0x0000000000000000000000000000000000000000',
  goerli: '0x0000000000000000000000000000000000000000',
  rinkeby: '0x0000000000000000000000000000000000000000',
  polygon: '0x5FFD62D3C3eE2E81C00A7b9079FB248e7dF024A8',
  arbitrum: '0xa0b862F60edEf4452F25B4160F177db44DeB6Cf1',
  dev: '0x0000000000000000000000000000000000000000',
};

function forNetwork(addressByNetwork: AddressByNetwork, network: string): Address {
  if (network == 'mainnet') {
    return Address.fromString(addressByNetwork.mainnet);
  } else if (network == 'kovan') {
    return Address.fromString(addressByNetwork.kovan);
  } else if (network == 'goerli') {
    return Address.fromString(addressByNetwork.goerli);
  } else if (network == 'rinkeby') {
    return Address.fromString(addressByNetwork.rinkeby);
  } else if (network == 'matic') {
    return Address.fromString(addressByNetwork.polygon);
  } else if (network == 'arbitrum-one') {
    return Address.fromString(addressByNetwork.arbitrum);
  } else {
    return Address.fromString(addressByNetwork.dev);
  }
}

export let VAULT_ADDRESS = forNetwork(vaultAddressByNetwork, network);
export let WETH: Address = forNetwork(wethAddressByNetwork, network);
export let WMATIC: Address = forNetwork(wMaticAddressByNetwork, network);
export let WBTC: Address = forNetwork(wbtcAddressByNetwork, network);
export let USD: Address = forNetwork(usdAddressByNetwork, network);
export let USDC: Address = forNetwork(usdcAddressByNetwork, network);
export let USDT: Address = forNetwork(usdtAddressByNetwork, network);
export let BAL: Address = forNetwork(balAddressByNetwork, network);
export let DAI: Address = forNetwork(daiAddressByNetwork, network);
export let MKR: Address = forNetwork(mkrAddressByNetwork, network);
export let GNO: Address = forNetwork(gnoAddressByNetwork, network);

let ALT_DAI = forNetwork(altDaiAddressByNetwork, network);
let ALT_USDC = forNetwork(altUsdcAddressByNetwork, network);
let ALT_USDT = forNetwork(altUsdtAddressByNetwork, network);
let LINEAR_DAI = forNetwork(linearDaiAddressByNetwork, network);
let LINEAR_USDC = forNetwork(linearUsdcAddressByNetwork, network);
let LINEAR_USDT = forNetwork(linearUsdtAddressByNetwork, network);

// PRICING_ASSETS must be sorted by order of preference
export let PRICING_ASSETS: Address[] = [
  WETH,
  WMATIC,
  WBTC,
  USDC,
  DAI,
  USDT,
  BAL,
  MKR,
  GNO,
  ALT_DAI,
  ALT_USDC,
  ALT_USDT,
  LINEAR_DAI,
  LINEAR_USDC,
  LINEAR_USDT,
];
export let USD_STABLE_ASSETS: Address[] = [USDC, DAI, USDT, ALT_DAI, ALT_USDC, ALT_USDT];
