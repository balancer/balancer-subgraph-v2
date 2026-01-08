import { BigDecimal, Address, BigInt, Bytes } from '@graphprotocol/graph-ts';
import { Pool, PoolToken, PoolShare, PriceRateProvider, Token, FXOracle } from '../../types/schema';
import { ERC20 } from '../../types/Vault/ERC20';
import { Vault } from '../../types/Vault/Vault';
import { ONE_BD, SWAP_IN, SWAP_OUT, VAULT_ADDRESS, ZERO_ADDRESS, ZERO_BD } from './constants';
import { PoolType, getPoolAddress, isComposableStablePool } from './pools';
import { ComposableStablePool } from '../../types/ComposableStablePoolFactory/ComposableStablePool';

export function bytesToAddress(address: Bytes): Address {
  return Address.fromString(address.toHexString());
}

export function stringToBytes(str: string): Bytes {
  return Bytes.fromByteArray(Bytes.fromHexString(str));
}

export function hexToBigInt(hex: string): BigInt {
  let hexUpper = hex.toUpperCase();
  let bigInt = BigInt.fromI32(0);
  let power = BigInt.fromI32(1);

  for (let i = hex.length - 1; i >= 0; i--) {
    let char = hexUpper.charCodeAt(i);
    let value = 0;

    if (char >= 48 && char <= 57) {
      value = char - 48;
    } else if (char >= 65 && char <= 70) {
      value = char - 55;
    }

    bigInt = bigInt.plus(BigInt.fromI32(value).times(power));
    power = power.times(BigInt.fromI32(16));
  }

  return bigInt;
}

export function getTokenDecimals(tokenAddress: Address): i32 {
  let token = ERC20.bind(tokenAddress);
  let result = token.try_decimals();

  return result.reverted ? 0 : result.value;
}

export function tokenToDecimal(amount: BigInt, decimals: i32): BigDecimal {
  let scale = BigInt.fromI32(10)
    .pow(decimals as u8)
    .toBigDecimal();
  return amount.toBigDecimal().div(scale);
}

export function scaleDown(num: BigInt, decimals: i32): BigDecimal {
  return num.divDecimal(BigInt.fromI32(10).pow(u8(decimals)).toBigDecimal());
}

export function scaleUp(num: BigDecimal, decimals: i32): BigInt {
  return BigInt.fromString(
    num
      .truncate(decimals)
      .times(BigInt.fromI32(10).pow(u8(decimals)).toBigDecimal())
      .toString()
  );
}

export function getPoolShareId(poolControllerAddress: Address, lpAddress: Address): string {
  return poolControllerAddress.toHex().concat('-').concat(lpAddress.toHex());
}

export function getPoolShare(poolId: string, lpAddress: Address): PoolShare {
  let poolShareId = getPoolShareId(getPoolAddress(poolId), lpAddress);
  let poolShare = PoolShare.load(poolShareId);
  if (poolShare == null) {
    return createPoolShareEntity(poolId, lpAddress);
  }
  return poolShare;
}

export function createPoolShareEntity(poolId: string, lpAddress: Address): PoolShare {
  let id = getPoolShareId(getPoolAddress(poolId), lpAddress);
  let poolShare = new PoolShare(id);

  poolShare.userAddress = lpAddress;
  poolShare.poolId = poolId;
  poolShare.balance = ZERO_BD;
  poolShare.save();
  return poolShare;
}

// pool entity when created
export function newPoolEntity(poolId: string): Pool {
  let pool = new Pool(poolId);
  pool.vaultID = '2';
  pool.strategyType = i32(parseInt(poolId.slice(42, 46)));
  pool.tokensList = [];
  pool.totalWeight = ZERO_BD;
  pool.totalShares = ZERO_BD;
  pool.swapsCount = BigInt.fromI32(0);
  pool.holdersCount = BigInt.fromI32(0);

  return pool;
}

export function getPoolTokenId(poolId: string, tokenAddress: Address): string {
  return poolId.concat('-').concat(tokenAddress.toHexString());
}

export function loadPoolToken(poolId: string, tokenAddress: Address): PoolToken | null {
  return PoolToken.load(getPoolTokenId(poolId, tokenAddress));
}

export function createPoolTokenEntity(pool: Pool, tokenAddress: Address, tokenIndex: i32): void {
  let poolTokenId = getPoolTokenId(pool.id, tokenAddress);

  let token = ERC20.bind(tokenAddress);
  let symbol = '';
  let name = '';
  let decimals = 18;

  let symbolCall = token.try_symbol();
  let nameCall = token.try_name();
  let decimalCall = token.try_decimals();

  if (symbolCall.reverted) {
    // TODO
    //const symbolBytesCall = tokenBytes.try_symbol();
    //if (!symbolBytesCall.reverted) {
    //symbol = symbolBytesCall.value.toString();
  } else {
    symbol = symbolCall.value;
  }

  if (nameCall.reverted) {
    //const nameBytesCall = tokenBytes.try_name();
    //if (!nameBytesCall.reverted) {
    //name = nameBytesCall.value.toString();
    //}
  } else {
    name = nameCall.value;
  }

  if (!decimalCall.reverted) {
    decimals = decimalCall.value;
  }

  let poolToken = new PoolToken(poolTokenId);
  // ensures token entity is created
  let _token = getToken(tokenAddress);
  poolToken.poolId = pool.id;
  poolToken.address = tokenAddress.toHexString();
  poolToken.name = name;
  poolToken.symbol = symbol;
  poolToken.decimals = decimals;
  poolToken.balance = ZERO_BD;
  poolToken.paidProtocolFees = ZERO_BD;
  poolToken.priceRate = ONE_BD;
  poolToken.oldPriceRate = ONE_BD;
  poolToken.token = _token.id;
  poolToken.index = tokenIndex;

  if (isComposableStablePool(pool)) {
    let poolAddress = bytesToAddress(pool.address);
    let poolContract = ComposableStablePool.bind(poolAddress);
    let isTokenExemptCall = poolContract.try_isTokenExemptFromYieldProtocolFee(tokenAddress);

    if (!isTokenExemptCall.reverted) {
      poolToken.isExemptFromYieldProtocolFee = isTokenExemptCall.value;
    }
  } else if (pool.poolType == PoolType.Weighted && pool.poolTypeVersion == 4) {
    let poolAddress = bytesToAddress(pool.address);
    // ComposableStable ABI has the same getRateProviders function as WeightedV4
    let poolContract = ComposableStablePool.bind(poolAddress);
    let rateProvidersCall = poolContract.try_getRateProviders();

    // check array length to avoid out of bounds error if call doesn't revert but returns empty array
    if (!rateProvidersCall.reverted && rateProvidersCall.value.length > tokenIndex) {
      poolToken.isExemptFromYieldProtocolFee = rateProvidersCall.value[tokenIndex] == ZERO_ADDRESS;
    }
  }

  poolToken.save();
}

export function loadPriceRateProvider(poolId: string, tokenAddress: Address): PriceRateProvider | null {
  return PriceRateProvider.load(getPoolTokenId(poolId, tokenAddress));
}

export function getTokenPriceId(
  poolId: string,
  tokenAddress: Address,
  stableTokenAddress: Address,
  block: BigInt
): string {
  return poolId
    .concat('-')
    .concat(tokenAddress.toHexString())
    .concat('-')
    .concat(stableTokenAddress.toHexString())
    .concat('-')
    .concat(block.toString());
}

export function createToken(tokenAddress: Address): Token {
  let erc20token = ERC20.bind(tokenAddress);
  let token = new Token(tokenAddress.toHexString());
  let name = '';
  let symbol = '';
  let decimals = 0;

  // attempt to retrieve erc20 values
  let maybeName = erc20token.try_name();
  let maybeSymbol = erc20token.try_symbol();
  let maybeDecimals = erc20token.try_decimals();

  if (!maybeName.reverted) name = maybeName.value;
  if (!maybeSymbol.reverted) symbol = maybeSymbol.value;
  if (!maybeDecimals.reverted) decimals = maybeDecimals.value;

  token.name = name;
  token.symbol = symbol;
  token.decimals = decimals;
  token.totalBalanceNotional = ZERO_BD;
  token.address = tokenAddress.toHexString();
  token.save();
  return token;
}

// this will create the token entity and populate
// with erc20 values
export function getToken(tokenAddress: Address): Token {
  let token = Token.load(tokenAddress.toHexString());
  if (token == null) {
    token = createToken(tokenAddress);
  }
  return token;
}

export function updateTokenBalances(tokenAddress: Address, notionalBalance: BigDecimal, swapDirection: i32): void {
  let token = getToken(tokenAddress);

  if (swapDirection == SWAP_IN) {
    const totalBalanceNotional = token.totalBalanceNotional.plus(notionalBalance);
    token.totalBalanceNotional = totalBalanceNotional;
  } else if (swapDirection == SWAP_OUT) {
    const totalBalanceNotional = token.totalBalanceNotional.minus(notionalBalance);
    token.totalBalanceNotional = totalBalanceNotional;
  }

  token.save();
}

export function computeCuratedSwapEnabled(
  isPaused: boolean,
  swapEnabledCurationSignal: boolean,
  internalSwapEnabled: boolean
): boolean {
  if (isPaused) return false;
  if (swapEnabledCurationSignal == null) return internalSwapEnabled;
  return swapEnabledCurationSignal && internalSwapEnabled;
}

export function getProtocolFeeCollector(): Address | null {
  let vaultContract = Vault.bind(VAULT_ADDRESS);
  let feesCollector = vaultContract.try_getProtocolFeesCollector();
  if (feesCollector.reverted) return null;

  return feesCollector.value;
}

export function getFXOracle(oracleAddress: Address): FXOracle {
  let oracle = FXOracle.load(oracleAddress.toHexString());
  if (oracle == null) {
    oracle = new FXOracle(oracleAddress.toHexString());
    oracle.tokens = [];
    oracle.save();
  }
  return oracle;
}
