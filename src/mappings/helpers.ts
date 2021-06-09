import { BigDecimal, Address, BigInt, Bytes } from '@graphprotocol/graph-ts';
import { Pool, User, PoolToken, PoolShare, PoolSnapshot } from '../types/schema';
import { ERC20 } from '../types/Vault/ERC20';
import { ZERO_BD } from './constants';

const DAY = 24 * 60 * 60;

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
  createUserEntity(lpAddress);
  let poolControllerAddress = Address.fromString(pool.address.toHexString());

  let id = getPoolShareId(poolControllerAddress, lpAddress);
  let poolShare = new PoolShare(id);

  poolShare.userAddress = lpAddress.toHex();
  poolShare.poolAddress = pool.address.toHex();
  poolShare.balance = ZERO_BD;
  poolShare.save();
}

export class PoolIdDetails {
  address: Address;
  strategyType: i32;
}

export function poolIdDetails(poolId: Bytes): PoolIdDetails {
  let address = Address.fromString(poolId.toHexString().slice(0, 42));
  let strategyType = i32(parseInt(poolId.toHexString().slice(42, 46)));
  return {
    address,
    strategyType,
  };
}

export function getPoolTokenId(poolAddress: Address, tokenAddress: Address): string {
  return poolAddress.toHexString().concat('-').concat(tokenAddress.toHexString());
}
// pool entity when created
export function newPoolEntity(poolAddress: string, poolId: Bytes): Pool {
  let pool = new Pool(poolAddress);
  pool.poolId = poolId;
  pool.vaultID = '2';
  pool.strategyType = poolIdDetails(poolId).strategyType;
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

export function createPoolTokenEntity(poolAddress: Address, tokenAddress: Address): void {
  let poolTokenId = getPoolTokenId(poolAddress, tokenAddress);

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
  poolToken.poolAddress = poolAddress.toHexString();
  poolToken.address = tokenAddress.toHexString();
  poolToken.name = name;
  poolToken.symbol = symbol;
  poolToken.decimals = decimals;
  poolToken.balance = ZERO_BD;
  poolToken.invested = ZERO_BD;
  poolToken.save();
}

export function getTokenPriceId(
  poolAddress: Address,
  tokenAddress: Address,
  stableTokenAddress: Address,
  block: BigInt
): string {
  return poolAddress
    .toHexString()
    .concat('-')
    .concat(tokenAddress.toHexString())
    .concat('-')
    .concat(stableTokenAddress.toHexString())
    .concat('-')
    .concat(block.toString());
}

export function createPoolSnapshot(poolAddress: Address, timestamp: i32): void {
  let dayTimestamp = timestamp - (timestamp % DAY); // Todays Timestamp

  let pool = Pool.load(poolAddress.toHexString());
  // Save pool snapshot
  let snapshotId = poolAddress.toHexString() + '-' + dayTimestamp.toString();
  let snapshot = new PoolSnapshot(snapshotId);

  if (!pool.tokensList) {
    return;
  }

  let tokens = pool.tokensList;
  let amounts = new Array<BigDecimal>(tokens.length);
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];
    let tokenAddress = Address.fromString(token.toHexString());
    let poolTokenId = getPoolTokenId(poolAddress, tokenAddress);
    let poolToken = PoolToken.load(poolTokenId);
    amounts[i] = poolToken.balance;
  }

  snapshot.pool = poolAddress.toHexString();
  snapshot.amounts = amounts;
  snapshot.totalShares = pool.totalShares;
  snapshot.swapVolume = ZERO_BD;
  snapshot.swapFees = pool.totalSwapFee;
  snapshot.timestamp = dayTimestamp;
  snapshot.save();
}

export function saveSwapToSnapshot(poolAddress: Address, timestamp: i32, volume: BigDecimal, fees: BigDecimal): void {
  let dayTimestamp = timestamp - (timestamp % DAY); // Todays timestamp

  // Save pool snapshot
  let snapshotId = poolAddress.toHexString() + '-' + dayTimestamp.toString();
  let snapshot = PoolSnapshot.load(snapshotId);

  if (!snapshot) {
    return;
  }

  snapshot.swapVolume = snapshot.swapVolume.plus(volume);
  snapshot.swapFees = snapshot.swapFees.plus(fees);
  snapshot.save();
}

export function createUserEntity(address: Address): void {
  let addressHex = address.toHex();
  if (User.load(addressHex) == null) {
    let user = new User(addressHex);
    user.save();
  }
}
