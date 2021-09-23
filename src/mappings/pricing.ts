import { PRICING_ASSETS, USD_STABLE_ASSETS } from './helpers/constants';
import { getTokenPriceId, loadPoolToken } from './helpers/misc';
import { Address, Bytes, BigInt, BigDecimal } from '@graphprotocol/graph-ts';
import { Pool, TokenPrice, Balancer, PoolHistoricalLiquidity, LatestPrice } from '../types/schema';
import { ZERO_BD } from './helpers/constants';

export function isPricingAsset(asset: Address): boolean {
  for (let i: i32 = 0; i < PRICING_ASSETS.length; i++) {
    if (PRICING_ASSETS[i] == asset) return true;
  }
  return false;
}

export function updatePoolLiquidity(poolId: string, block: BigInt, pricingAsset: Address): boolean {
  let pool = Pool.load(poolId);
  if (pool == null) return false;

  let tokensList: Bytes[] = pool.tokensList;
  if (tokensList.length < 2) return false;

  let poolValue: BigDecimal = BigDecimal.fromString('0');

  for (let j: i32 = 0; j < tokensList.length; j++) {
    let tokenAddress: Address = Address.fromString(tokensList[j].toHexString());

    let poolToken = loadPoolToken(poolId, tokenAddress);
    if (poolToken == null) continue;

    if (tokenAddress == pricingAsset) {
      poolValue = poolValue.plus(poolToken.balance);
      continue;
    }
    let poolTokenQuantity: BigDecimal = poolToken.balance;

    // compare any new token price with the last price
    let tokenPriceId = getTokenPriceId(poolId, tokenAddress, pricingAsset, block);
    let tokenPrice = TokenPrice.load(tokenPriceId);
    let price: BigDecimal;
    let latestPriceId = getLatestPriceId(tokenAddress, pricingAsset);
    let latestPrice = LatestPrice.load(latestPriceId);

    if (tokenPrice == null && latestPrice != null) {
      price = latestPrice.price;
    }
    // note that we can only meaningfully report liquidity once assets are traded with
    // the pricing asset
    if (tokenPrice) {
      //value in terms of priceableAsset
      price = tokenPrice.price;

      // Possibly update latest price
      if (latestPrice == null) {
        latestPrice = new LatestPrice(latestPriceId);
        latestPrice.asset = tokenAddress;
        latestPrice.pricingAsset = pricingAsset;
      }
      latestPrice.price = price;
      latestPrice.block = block;
      latestPrice.poolId = poolId;
      latestPrice.save();
    }
    if (price) {
      let poolTokenValue = price.times(poolTokenQuantity);
      poolValue = poolValue.plus(poolTokenValue);
    }
  }

  let oldPoolLiquidity: BigDecimal = pool.totalLiquidity;
  let newPoolLiquidity: BigDecimal = valueInUSD(poolValue, pricingAsset) || ZERO_BD;

  // If the pool isn't empty but we have a zero USD value then it's likely that we have a bad pricing asset
  // Don't commit any changes and just report the failure.
  if (poolValue.gt(ZERO_BD) != newPoolLiquidity.gt(ZERO_BD)) {
    return false;
  }

  // Take snapshot of pool state
  let phlId = getPoolHistoricalLiquidityId(poolId, pricingAsset, block);
  let phl = new PoolHistoricalLiquidity(phlId);
  phl.poolId = poolId;
  phl.pricingAsset = pricingAsset;
  phl.block = block;
  phl.poolTotalShares = pool.totalShares;
  phl.poolLiquidity = poolValue;
  phl.poolShareValue = poolValue.div(pool.totalShares);
  phl.save();

  // Update pool stats
  pool.totalLiquidity = newPoolLiquidity;
  pool.save();

  // Update global stats
  let vault = Balancer.load('2') as Balancer;
  let liquidityChange: BigDecimal = newPoolLiquidity.minus(oldPoolLiquidity);
  vault.totalLiquidity = vault.totalLiquidity.plus(liquidityChange);
  vault.save();

  return true;
}

export function valueInUSD(value: BigDecimal, pricingAsset: Address): BigDecimal {
  let usdValue = ZERO_BD;

  if (isUSDStable(pricingAsset)) {
    usdValue = value;
  } else {
    // convert to USD
    for (let i: i32 = 0; i < USD_STABLE_ASSETS.length; i++) {
      let pricingAssetInUSD = LatestPrice.load(getLatestPriceId(pricingAsset, USD_STABLE_ASSETS[i]));
      if (pricingAssetInUSD != null) {
        usdValue = value.times(pricingAssetInUSD.price);
        break;
      }
    }
  }

  return usdValue;
}

function getLatestPriceId(tokenAddress: Address, pricingAsset: Address): string {
  return tokenAddress.toHexString().concat('-').concat(pricingAsset.toHexString());
}

function getPoolHistoricalLiquidityId(poolId: string, tokenAddress: Address, block: BigInt): string {
  return poolId.concat('-').concat(tokenAddress.toHexString()).concat('-').concat(block.toString());
}

function isUSDStable(asset: Address): boolean {
  for (let i: i32 = 0; i < USD_STABLE_ASSETS.length; i++) {
    if (USD_STABLE_ASSETS[i] == asset) return true;
  }
  return false;
}
