import { BigDecimal, Address, dataSource } from '@graphprotocol/graph-ts';

export let ZERO_BD = BigDecimal.fromString('0');

export let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export class AddressByNetwork {
  public mainnet: string;
  public kovan: string;
  public dev: string;
}

let network: string = dataSource.network();

let vaultAddressByNetwork: AddressByNetwork = {
  mainnet: '0xTODO',
  kovan: '0xba1222227c37746aDA22d10Da6265E02E44400DD',
  dev: '0xa0B05b20e511B1612E908dFCeE0E407E22B76028',
};

let wethAddressByNetwork: AddressByNetwork = {
  mainnet: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  kovan: '0x02822e968856186a20fEc2C824D4B174D0b70502',
  dev: '0x4CDDb3505Cf09ee0Fa0877061eB654839959B9cd',
};

let wbtcAddressByNetwork: AddressByNetwork = {
  mainnet: '0xTODO',
  kovan: '0x1C8E3Bcb3378a443CC591f154c5CE0EBb4dA9648',
  dev: '0xcD80986f08d776CE41698c47f705CDc99dDBfB0A',
};

let usdAddressByNetwork: AddressByNetwork = {
  mainnet: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  kovan: '0xc2569dd7d0fd715B054fBf16E75B001E5c0C1115',
  dev: '0x1528f3fcc26d13f7079325fb78d9442607781c8c',
};
let usdcAddressByNetwork: AddressByNetwork = {
  mainnet: '0xTODO',
  kovan: '0xc2569dd7d0fd715B054fBf16E75B001E5c0C1115',
  dev: '0x7c0c5AdA758cf764EcD6bAC05b63b2482f90bBB2',
};

let balAddressByNetwork: AddressByNetwork = {
  mainnet: '0xba100000625a3754423978a60c9317c58a424e3D',
  kovan: '0x41286Bb1D3E870f3F750eB7E1C25d7E48c8A1Ac7',
  dev: '0xf702269193081364E355f862f2CFbFCdC5DB738C',
};

let daiAddressByNetwork: AddressByNetwork = {
  mainnet: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  kovan: '0x04DF6e4121c27713ED22341E7c7Df330F56f289B',
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

export let VAULT_ADDRESS = forNetwork(vaultAddressByNetwork, network);
export let WETH: Address = forNetwork(wethAddressByNetwork, network);
export let WBTC: Address = forNetwork(wbtcAddressByNetwork, network);
export let USD: Address = forNetwork(usdAddressByNetwork, network);
export let USDC: Address = forNetwork(usdcAddressByNetwork, network);
export let BAL: Address = forNetwork(balAddressByNetwork, network);
export let DAI: Address = forNetwork(daiAddressByNetwork, network);

export let PRICING_ASSETS: Address[] = [WETH, WBTC, USDC, DAI, BAL];
export let USD_STABLE_ASSETS: Address[] = [USDC, DAI];
