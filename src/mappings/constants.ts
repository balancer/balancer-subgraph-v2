import { BigDecimal, Address, BigInt, Bytes, dataSource, ethereum } from '@graphprotocol/graph-ts';

let network = dataSource.network();

export let ZERO_BD = BigDecimal.fromString('0');

export let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export let WETH: Address =
  Address.fromString(
    network == 'mainnet'
    ? '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    : '0x4CDDb3505Cf09ee0Fa0877061eB654839959B9cd'
  );

export let WBTC: Address =
  Address.fromString(
    network == 'mainnet'
    ? '0xTODO'
    : '0xcD80986f08d776CE41698c47f705CDc99dDBfB0A'
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
    : '0x7c0c5AdA758cf764EcD6bAC05b63b2482f90bBB2'
  )

export let DAI: Address =
  Address.fromString(
    network == 'mainet'
    ? '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    : '0x5C0E66606eAbEC1df45E2ADd26C5DF8C0895a397'
  )

export let BAL: Address =
  Address.fromString(
    network == 'mainet'
    ? '0xba100000625a3754423978a60c9317c58a424e3D'
    : '0xf702269193081364E355f862f2CFbFCdC5DB738C'
  )


export let PRICING_ASSETS: Address[] = [WETH, WBTC, USDC, DAI, BAL];
export let USD_STABLE_ASSETS: Address[] = [USDC, DAI];
