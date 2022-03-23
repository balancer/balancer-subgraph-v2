import { Address, Bytes, BigDecimal } from '@graphprotocol/graph-ts';
import { Pool, Balancer, LatestPrice } from '../types/schema';
import { ZERO_BD, PRICING_ASSETS, USD_STABLE_ASSETS, ONE_BD } from './constants';
import { hasVirtualSupply, PoolType } from './pools';
import { getToken, loadPoolToken } from './misc';

export function isPricingAsset(asset: Address): boolean {
  for (let i: i32 = 0; i < PRICING_ASSETS.length; i++) {
    if (PRICING_ASSETS[i] == asset) return true;
  }
  return false;
}

export function updatePoolLiquidity(poolId: string, pricingAsset: Address): boolean {
  let pool = Pool.load(poolId);
  if (pool == null) return false;

  let tokensList: Bytes[] = pool.tokensList;
  if (tokensList.length < 2) return false;
  if (hasVirtualSupply(pool) && pool.address == pricingAsset) return false;

  let poolValue: BigDecimal = ZERO_BD;

  for (let j: i32 = 0; j < tokensList.length; j++) {
    let tokenAddress: Address = Address.fromString(tokensList[j].toHexString());

    let poolToken = loadPoolToken(poolId, tokenAddress);
    if (poolToken == null) continue;

    if (tokenAddress == pricingAsset) {
      poolValue = poolValue.plus(poolToken.balance);
      continue;
    }
    let poolTokenQuantity: BigDecimal = poolToken.balance;

    let price: BigDecimal = ZERO_BD;
    let latestPriceId = getLatestPriceId(tokenAddress, pricingAsset);
    let latestPrice = LatestPrice.load(latestPriceId);

    // note that we can only meaningfully report liquidity once assets are traded with
    // the pricing asset
    if (latestPrice != null) {
      // value in terms of priceableAsset
      price = latestPrice.price;

      let token = getToken(tokenAddress);
      token.latestPrice = latestPrice.id;
      token.save();
    } else if (pool.poolType == PoolType.StablePhantom) {
      // try to estimate token price in terms of pricing asset
      let pricingAssetInUSD = valueInUSD(ONE_BD, pricingAsset);
      let currentTokenInUSD = valueInUSD(ONE_BD, tokenAddress);

      if (pricingAssetInUSD.equals(ZERO_BD) || currentTokenInUSD.equals(ZERO_BD)) {
        continue;
      }

      price = currentTokenInUSD.div(pricingAssetInUSD);
    }

    // Exclude virtual supply from pool value
    if (hasVirtualSupply(pool) && pool.address == tokenAddress) {
      continue;
    }

    if (price.gt(ZERO_BD)) {
      let poolTokenValue = price.times(poolTokenQuantity);
      poolValue = poolValue.plus(poolTokenValue);
    }
  }

  let oldPoolLiquidity: BigDecimal = pool.totalLiquidity;
  let newPoolLiquidity: BigDecimal = valueInUSD(poolValue, pricingAsset) || ZERO_BD;
  let liquidityChange: BigDecimal = newPoolLiquidity.minus(oldPoolLiquidity);

  // If the pool isn't empty but we have a zero USD value then it's likely that we have a bad pricing asset
  // Don't commit any changes and just report the failure.
  if (poolValue.gt(ZERO_BD) != newPoolLiquidity.gt(ZERO_BD)) {
    return false;
  }

  // Update pool stats
  pool.totalLiquidity = newPoolLiquidity;
  pool.save();

  // Update global stats
  let vault = Balancer.load('2') as Balancer;
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

export function swapValueInUSD(
  tokenInAddress: Address,
  tokenAmountIn: BigDecimal,
  tokenOutAddress: Address,
  tokenAmountOut: BigDecimal
): BigDecimal {
  let swapValueUSD = ZERO_BD;

  if (isUSDStable(tokenOutAddress)) {
    swapValueUSD = valueInUSD(tokenAmountOut, tokenOutAddress);
  } else if (isUSDStable(tokenInAddress)) {
    swapValueUSD = valueInUSD(tokenAmountIn, tokenInAddress);
  } else {
    let tokenInSwapValueUSD = valueInUSD(tokenAmountIn, tokenInAddress);
    let tokenOutSwapValueUSD = valueInUSD(tokenAmountOut, tokenOutAddress);
    let divisor =
      tokenInSwapValueUSD.gt(ZERO_BD) && tokenOutSwapValueUSD.gt(ZERO_BD) ? BigDecimal.fromString('2') : ONE_BD;
    swapValueUSD = tokenInSwapValueUSD.plus(tokenOutSwapValueUSD).div(divisor);
  }

  return swapValueUSD;
}

export function getLatestPriceId(tokenAddress: Address, pricingAsset: Address): string {
  return tokenAddress.toHexString().concat('-').concat(pricingAsset.toHexString());
}

export function isUSDStable(asset: Address): boolean {
  for (let i: i32 = 0; i < USD_STABLE_ASSETS.length; i++) {
    if (USD_STABLE_ASSETS[i] == asset) return true;
  }
  return false;
}
