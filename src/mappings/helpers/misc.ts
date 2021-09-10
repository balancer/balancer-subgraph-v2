import { BigDecimal, Address, BigInt, log } from '@graphprotocol/graph-ts';
import {
  Pool,
  User,
  PoolToken,
  PoolShare,
  PoolSnapshot,
  PriceRateProvider,
  BalancerSnapshot,
  UserSnapshot,
  TradePair,
  TradePairSnapshot,
} from '../../types/schema';
import { ERC20 } from '../../types/Vault/ERC20';
import { ONE_BD, ZERO_BD } from './constants';
import { getToken } from './tokens';

const DAY = 24 * 60 * 60;

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

export function getPoolShareId(poolControllerAddress: Address, lpAddress: Address): string {
  return poolControllerAddress.toHex().concat('-').concat(lpAddress.toHex());
}

export function createPoolShareEntity(pool: Pool, lpAddress: Address): void {
  getUser(lpAddress);
  let poolControllerAddress = Address.fromString(pool.address.toHexString());

  let id = getPoolShareId(poolControllerAddress, lpAddress);
  let poolShare = new PoolShare(id);

  poolShare.userAddress = lpAddress.toHex();
  poolShare.poolId = pool.id;
  poolShare.balance = ZERO_BD;
  poolShare.save();
}

// pool entity when created
export function newPoolEntity(poolId: string): Pool {
  let pool = new Pool(poolId);
  pool.vaultID = '2';
  pool.strategyType = i32(parseInt(poolId.slice(42, 46)));
  pool.tokensList = [];
  pool.totalWeight = ZERO_BD;
  pool.totalSwapVolume = ZERO_BD;
  pool.totalSwapFee = ZERO_BD;
  pool.totalLiquidity = ZERO_BD;
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

export function createPoolTokenEntity(poolId: string, tokenAddress: Address): void {
  let poolTokenId = getPoolTokenId(poolId, tokenAddress);

  // ensures that a token entity is created to track against
  // pool tokens
  let token = getToken(tokenAddress);

  let poolToken = new PoolToken(poolTokenId);
  poolToken.poolId = poolId;
  poolToken.balance = ZERO_BD;
  poolToken.invested = ZERO_BD;
  poolToken.priceRate = ONE_BD;
  poolToken.token = token.id;
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

export function createPoolSnapshot(poolId: string, timestamp: i32): void {
  let dayTimestamp = timestamp - (timestamp % DAY); // Todays Timestamp

  let pool = Pool.load(poolId);
  // Save pool snapshot
  let snapshotId = poolId + '-' + dayTimestamp.toString();
  let snapshot = new PoolSnapshot(snapshotId);

  if (!pool.tokensList) {
    return;
  }

  let tokens = pool.tokensList;
  let amounts = new Array<BigDecimal>(tokens.length);
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];
    let tokenAddress = Address.fromString(token.toHexString());
    let poolToken = loadPoolToken(poolId, tokenAddress);

    amounts[i] = poolToken.balance;
  }

  snapshot.pool = poolId;
  snapshot.amounts = amounts;
  snapshot.totalShares = pool.totalShares;
  snapshot.swapVolume = ZERO_BD;
  snapshot.swapFees = pool.totalSwapFee;
  snapshot.timestamp = dayTimestamp;
  snapshot.save();
}

export function saveSwapToSnapshot(poolAddress: string, timestamp: i32, volume: BigDecimal, fees: BigDecimal): void {
  let dayTimestamp = timestamp - (timestamp % DAY); // Todays timestamp

  // Save pool snapshot
  let snapshotId = poolAddress + '-' + dayTimestamp.toString();
  let snapshot = PoolSnapshot.load(snapshotId);

  if (!snapshot) {
    return;
  }

  snapshot.swapVolume = snapshot.swapVolume.plus(volume);
  snapshot.swapFees = snapshot.swapFees.plus(fees);
  snapshot.save();
}

export function getUser(address: Address): User {
  let addressHex = address.toHex();
  let user = User.load(addressHex);
  if (user == null) {
    user = new User(addressHex);
    user.totalLiquidity = ZERO_BD;
    user.totalSwapFee = ZERO_BD;
    user.totalSwapVolume = ZERO_BD;
    user.save();
  }
  return user as User;
}

export function getBalancerSnapshot(vaultId: string, timestamp: i32): BalancerSnapshot {
  let dayID = timestamp / 86400;
  let id = vaultId + '-' + dayID.toString();
  let snapshot = BalancerSnapshot.load(id);

  if (snapshot == null) {
    let dayStartTimestamp = dayID * 86400;
    snapshot = new BalancerSnapshot(id);
    snapshot.poolCount = 0;
    snapshot.totalLiquidity = ZERO_BD;
    snapshot.totalSwapFee = ZERO_BD;
    snapshot.totalSwapVolume = ZERO_BD;
    snapshot.vault = vaultId;
    snapshot.timestamp = dayStartTimestamp;
    snapshot.save();
  }

  return snapshot as BalancerSnapshot;
}

export function getUserSnapshot(userAddress: Address, timestamp: i32): UserSnapshot {
  let dayID = timestamp / 86400;
  let id = userAddress.toHexString() + '-' + dayID.toString();
  let snapshot = UserSnapshot.load(id);

  if (snapshot == null) {
    let dayStartTimestamp = dayID * 86400;
    snapshot = new UserSnapshot(id);

    snapshot.totalLiquidity = ZERO_BD;
    snapshot.totalSwapFee = ZERO_BD;
    snapshot.totalSwapVolume = ZERO_BD;
    snapshot.user = userAddress.toHexString();

    snapshot.timestamp = BigInt.fromI32(dayStartTimestamp);
    snapshot.save();
  }

  return snapshot as UserSnapshot;
}

export function getTradePair(token0Address: Address, token1Address: Address): TradePair {
  let sortedAddressses = new Array<string>(2);
  sortedAddressses[0] = token0Address.toHexString();
  sortedAddressses[1] = token1Address.toHexString();
  sortedAddressses.sort();

  let tradePairId = sortedAddressses[0] + "-" + sortedAddressses[1];
  let tradePair = TradePair.load(tradePairId);
  if (tradePair == null) {
    tradePair = new TradePair(tradePairId);
    tradePair.token0 = sortedAddressses[0];
    tradePair.token1 = sortedAddressses[1];
    tradePair.totalSwapFee = ZERO_BD;
    tradePair.totalSwapVolume = ZERO_BD;
    tradePair.save();
  }
  return tradePair as TradePair;
}

export function getTradePairSnapshot(tradePairId: string, timestamp: i32): TradePairSnapshot {
  let dayID = timestamp / 86400;
  let id = tradePairId + '-' + dayID.toString();
  let snapshot = TradePairSnapshot.load(id);
  if (!snapshot) {
    snapshot = new TradePairSnapshot(id);
    snapshot.pair = tradePairId;
    snapshot.timestamp = dayID;
    snapshot.totalSwapVolume = ZERO_BD;
    snapshot.totalSwapFee = ZERO_BD;
    snapshot.save();
  }
  return snapshot as TradePairSnapshot;
}