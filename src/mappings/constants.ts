import { BigDecimal, Address, BigInt, Bytes, dataSource, ethereum } from '@graphprotocol/graph-ts';

let network = dataSource.network();

export let ZERO_BD = BigDecimal.fromString('0');

export let WETH: Address =
  Address.fromString(
    network == 'mainnet'
    ? '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    : '0x6d5495Ce42aD2719AD9926c4EAC403d23E09d834'
  );

export let WBTC: Address =
  Address.fromString(
    network == 'mainnet'
    ? '0xTODO'
    : '0x2f53b3Ad9dD06bc83a1fb5B9c5CeB6B07194f356'
  );

export let USD: Address =
  Address.fromString(
    network == 'mainnet'
    ? '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' // USDC
    : '0x1528f3fcc26d13f7079325fb78d9442607781c8c'
  ); // DAI

export let USDC: Address =
  Address.fromString(
    network == 'mainnet'
    ? '0xTODO'
    : '0x6a0bc95bfc5abe306d40903422ee72b4bbfc21e2'
  )

export let DAI: Address =
  Address.fromString(
    network == 'mainet'
    ? '0xTODO'
    : '0xa92f958A1F4E89CCD2f68e2BccbeC0BD99Fa4D85'
  )

export let BAL: Address =
  Address.fromString(
    network == 'mainet'
    ? '0xTODO'
    : '0x0B04892da60C07F5e12015747d46F8451461cB97'
  )
