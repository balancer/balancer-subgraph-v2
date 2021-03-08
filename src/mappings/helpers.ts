import { BigDecimal, Address, BigInt, Bytes, dataSource, ethereum } from '@graphprotocol/graph-ts';
import { Pool, User, PoolToken, PoolTokenizer, PoolShare, TokenPrice, Balancer, PoolSnapshot } from '../types/schema';
import { ERC20 } from '../types/Vault/ERC20';
import { ZERO_BD, WETH, USD, BAL } from './constants';

const DAY = 24 * 60 * 60;

export function hexToDecimal(hexString: string, decimals: i32): BigDecimal {
  const bytes = Bytes.fromHexString(hexString).reverse() as Bytes;
  const bi = BigInt.fromUnsignedBytes(bytes);
  const scale = BigInt.fromI32(10)
    .pow(decimals as u8)
    .toBigDecimal();
  return bi.divDecimal(scale);
}

export function bigIntToDecimal(amount: BigInt, decimals: i32): BigDecimal {
  const scale = BigInt.fromI32(10)
    .pow(decimals as u8)
    .toBigDecimal();
  return amount.toBigDecimal().div(scale);
}

export function tokenToDecimal(amount: BigInt, decimals: i32): BigDecimal {
  let scale = BigInt.fromI32(10)
    .pow(decimals as u8)
    .toBigDecimal();
  return amount.toBigDecimal().div(scale);
}

export function scaleUp(num: BigInt, decimals: i32): BigInt {
  return num.times(
    BigInt.fromI32(10).pow(u8(decimals))
  )
}

export function scaleDown(num: BigInt, decimals: i32): BigDecimal {
  return num.divDecimal(
    (BigInt.fromI32(10).pow(u8(decimals))).toBigDecimal()
  )
}

export function getPoolShareId(poolControllerAddress: Address, lpAddress: Address): string {
  return poolControllerAddress.toHex().concat('-').concat(lpAddress.toHex());
}

export function createPoolShareEntity(poolController: PoolTokenizer, lpAddress: Address): void {
  createUserEntity(lpAddress);
  let poolControllerAddress = Address.fromString(poolController.id)

  let id = getPoolShareId(poolControllerAddress, lpAddress);
  let poolShare = new PoolShare(id);

  poolShare.userAddress = lpAddress.toHex();
  poolShare.poolTokenizerId = poolControllerAddress.toHex();
  poolShare.poolId = poolController.poolId;
  poolShare.balance = ZERO_BD;
  poolShare.save();
}

export function getPoolTokenId(poolId: string, tokenAddress: Address): string {
  return poolId.concat('-').concat(tokenAddress.toHexString());
}
// pool entity when created
export function newPoolEntity(poolId: string): Pool {
  let pool = new Pool(poolId);
  pool.active = true;
  pool.tokenized = true;
  pool.vaultID = '2';
  pool.tokensList = [];
  pool.strategyType = i32(parseInt(poolId.slice(42, 46)));

  pool.totalWeight = ZERO_BD;
  pool.totalSwapVolume = ZERO_BD;
  pool.totalSwapFee = ZERO_BD;
  pool.liquidity = ZERO_BD;
  pool.tokensCount = BigInt.fromI32(0);
  pool.swapsCount = BigInt.fromI32(0);

  pool.joinsCount = BigInt.fromI32(0);
  pool.exitsCount = BigInt.fromI32(0);

  return pool
}


export function createPoolTokenEntity(poolId: string, tokenAddress: Address): void {
  let poolTokenId = getPoolTokenId(poolId, tokenAddress);

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
  poolToken.poolId = poolId;
  poolToken.address = tokenAddress.toHexString();
  poolToken.name = name;
  poolToken.symbol = symbol;
  poolToken.decimals = decimals;
  poolToken.balance = ZERO_BD;
  poolToken.invested = ZERO_BD;
  poolToken.save();
}

export function getTokenPriceId(poolId: string, tokenAddress: Address, stableTokenAddress: Address, block: BigInt): string {
  return poolId.concat('-')
    .concat(tokenAddress.toHexString()).concat('-')
    .concat(stableTokenAddress.toHexString()).concat('-')
    .concat(block.toString());
}

//export function capturePrices(id: string): void {
  //const pool = Pool.load(id);
  //const tokensList: Array<Bytes> = pool.tokensList;
  //if (!tokensList || pool.tokensCount.lt(BigInt.fromI32(2))) return;

  //let pricingAssets = [BAL, WETH, USD]

  //pricingAssets.forEach((pa) => {
    //if (tokensList.includes(pa)) {
      //tokensList.filter(tokenAddress => tokenAddress !== pa).forEach(tokenAddress => {

        //let block  = BigInt.from(0); // TODO
        //let tokenPriceId = getTokenPriceId(id, tokenAddress, pa, block)
        //let tokenPrice = new TokenPrice(tokenPriceId);
        //tokenPrice.poolId = id;
        ////tokenPrice.timestamp = ???;
        //tokenPrice.pricingAsset = pa;
      //})
    //}
  //})
//}


export function decrPoolCount(finalized: boolean): void {
  const factory = Balancer.load('2');
  factory.poolCount -= 1;
  if (finalized) factory.finalizedPoolCount -= 1;
  factory.save();
}

export function createUserEntity(address: Address): void {
  let addressHex = address.toHex();
  if (User.load(addressHex) == null) {
    let user = new User(addressHex);
    user.save();
  }
}

export function createPoolSnapshot(poolAddress: string, timestamp: i32): void {
  let dayTimestamp = timestamp - (timestamp % DAY) + DAY; // Tomorrow's timestamp

  let pool = Pool.load(poolAddress);
  // Save pool snapshot
  let snapshotId = poolAddress + '-' + dayTimestamp.toString();
  let snapshot = new PoolSnapshot(snapshotId);
  let poolTokenizer = PoolTokenizer.load(pool.poolTokenizer);

  if (!pool.tokensList) {
    return;
  }
  if (!poolTokenizer) {
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
  snapshot.pool = poolAddress;
  snapshot.amounts = amounts;
  snapshot.totalShares = poolTokenizer.totalShares;
  snapshot.timestamp = dayTimestamp;
  snapshot.save();
}
