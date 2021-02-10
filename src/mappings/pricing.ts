import { PRICING_ASSETS, USD_STABLE_ASSETS, ZERO_BD, USD, WETH } from './constants';
import { getTokenPriceId, getPoolTokenId, getPoolHistoricalLiquidityId, scaleDown } from './helpers';
import { Address, Bytes, BigInt, BigDecimal } from '@graphprotocol/graph-ts';
import { Pool, PoolToken, TokenPrice, Balancer, PoolHistoricalLiquidity } from '../types/schema';

export function isPricingAsset(asset: Address): boolean {
  //for (let pa of PRICING_ASSETS) {
  for (let i: i32 = 0; i < PRICING_ASSETS.length; i++) {
    if (PRICING_ASSETS[i] == asset) return true;
  }
  return false;
}

export function isUSDStable(asset: Address): boolean {
  //for (let pa of PRICING_ASSETS) {
  for (let i: i32 = 0; i < USD_STABLE_ASSETS.length; i++) {
    if (USD_STABLE_ASSETS[i] == asset) return true;
  }
  return false;
}

export function updatePoolLiquidity(id: string, block: BigInt, pricingAsset: Address): void {
  let pool = Pool.load(id);
  if (pool.tokensCount.lt(BigInt.fromI32(2))) return;

  let tokenAddresses: Address[] = [];
  let tokensList: Bytes[] = pool.tokensList || [];

  for (let j: i32 = 0; j < tokensList.length; j++) {
    let tokenAddressString: string = tokensList[j].toHexString();
    tokenAddresses.push(Address.fromString(tokenAddressString))
  }

  //let phlId = id + pricingAsset.toString() + block.toString()
  let phlId = getPoolHistoricalLiquidityId(id, pricingAsset, block);
  let phl = new PoolHistoricalLiquidity(phlId)
  phl.poolId = id;
  phl.pricingAsset = pricingAsset;
  phl.block = block;

  let poolValue: BigDecimal = BigDecimal.fromString('0');
  for (let j: i32 = 0; j < tokenAddresses.length; j++) {
    let tokenAddress = tokenAddresses[j]
    let poolTokenId = getPoolTokenId(id, tokenAddress)
    let poolToken = PoolToken.load(poolTokenId)

    if (tokenAddresses[j] == pricingAsset) {
      poolValue = poolValue.plus(poolToken.balance)
      continue;
    }
    let tokenPriceId = getTokenPriceId(id, tokenAddress, pricingAsset, block);
    let tokenPrice = TokenPrice.load(tokenPriceId)
    // note that we can only meaningfully report liquidity once assets are traded with
    // the pricing asset
    if (tokenPrice) {
      //value in terms of priceableAsset
      let poolTokenQuantity: BigDecimal = poolToken.balance;
      let poolTokenValue = tokenPrice.price.times(poolTokenQuantity);

      poolValue = poolValue.plus(poolTokenValue)
    }
  }
  phl.poolLiquidity = poolValue;
  phl.save()

  let factory = Balancer.load('1');
  if (isUSDStable(pricingAsset)) {
    let oldPoolLiquidity: BigDecimal = pool.liquidity
    //factory.totalLiquidity = factory.totalLiquidity.minus(oldPoolLiquidity).plus(poolValue);
    //factory.save();
    //pool.liquidity = poolValue;
    //pool.save();
  }
}
