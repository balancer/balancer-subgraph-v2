import { BigDecimal, Address, dataSource } from '@graphprotocol/graph-ts';

export let ZERO_BD = BigDecimal.fromString('0');

export let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export class AddressByNetwork {
  public mainnet: string;
  public kovan: string;
  public dev: string;
}

let network: string = dataSource.network();

let wethAddressByNetwork: AddressByNetwork = {
  mainnet: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  kovan: '0xe1329748c41A140536e41049C95c36A53bCACee6',
  dev: '0x4CDDb3505Cf09ee0Fa0877061eB654839959B9cd',
};

let wbtcAddressByNetwork: AddressByNetwork = {
  mainnet: '0xTODO',
  kovan: '0x7A0Fbc1aD60E8d624215282afb0e877E51A08136',
  dev: '0xcD80986f08d776CE41698c47f705CDc99dDBfB0A',
};

let usdAddressByNetwork: AddressByNetwork = {
  mainnet: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  kovan: '0xFd05Bbf0e4E2fc552A67F3cb2dD2ecB289252eE1',
  dev: '0x1528f3fcc26d13f7079325fb78d9442607781c8c',
};
let usdcAddressByNetwork: AddressByNetwork = {
  mainnet: '0xTODO',
  kovan: '0xFd05Bbf0e4E2fc552A67F3cb2dD2ecB289252eE1',
  dev: '0x7c0c5AdA758cf764EcD6bAC05b63b2482f90bBB2',
};

let balAddressByNetwork: AddressByNetwork = {
  mainnet: '0xba100000625a3754423978a60c9317c58a424e3D',
  kovan: '0x1688C45BC51Faa1B783D274E03Da0A0B28A0A871',
  dev: '0xf702269193081364E355f862f2CFbFCdC5DB738C',
};

let daiAddressByNetwork: AddressByNetwork = {
  mainnet: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  kovan: '0x59935f19d720aD935beCdC34c4F367397a28DaED',
  dev: '0x5C0E66606eAbEC1df45E2ADd26C5DF8C0895a397',
};

function forNetwork(addressByNetwork: AddressByNetwork, network: string): Address {
  if (network == 'mainnet') {
    return Address.fromString(addressByNetwork.mainnet);
  } else if (network == 'kovan') {
    return Address.fromString(addressByNetwork.kovan);
  } else {
    return Address.fromString(addressByNetwork.dev);
  }
}

export let WETH: Address = forNetwork(wethAddressByNetwork, network);
export let WBTC: Address = forNetwork(wbtcAddressByNetwork, network);
export let USD: Address = forNetwork(usdAddressByNetwork, network);
export let USDC: Address = forNetwork(usdcAddressByNetwork, network);
export let BAL: Address = forNetwork(balAddressByNetwork, network);
export let DAI: Address = forNetwork(daiAddressByNetwork, network);

export let PRICING_ASSETS: Address[] = [WETH, WBTC, USDC, DAI, BAL];
export let USD_STABLE_ASSETS: Address[] = [USDC, DAI];
