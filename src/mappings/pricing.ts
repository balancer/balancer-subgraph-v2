import { PRICING_ASSETS, ZERO_BD, USD, WETH } from './constants';
import { Address, Bytes } from '@graphprotocol/graph-ts';
import { Pool, User, PoolToken, PoolShare, TokenPrice, Balancer } from '../types/schema';

export function isPricingAsset(asset: Address): boolean {
  //for (let pa of PRICING_ASSETS) {
  for (let i: i32 = 0; i < PRICING_ASSETS.length; i++) {
    if (PRICING_ASSETS[i] == asset) return true;
  }
  return false;
}
// TODO out of date
export function updatePoolLiquidity(id: string): void {
  const pool = Pool.load(id);
  const tokensList: Array<Bytes> = pool.tokensList;

  if (!tokensList || pool.tokensCount.lt(BigInt.fromI32(2))) return;

  // Find pool liquidity

  let hasPrice = false;
  let hasUsdPrice = false;
  const poolLiquidity = ZERO_BD;

  if (tokensList.includes(USD)) {
    const usdPoolTokenId = id.concat('-').concat(USD.toString());
    //const usdPoolToken = PoolToken.load(usdPoolTokenId);
    //poolLiquidity = usdPoolToken.balance.div(usdPoolToken.denormWeight).times(pool.totalWeight)
    hasPrice = true;
    hasUsdPrice = true;
  } else if (tokensList.includes(WETH)) {
    const wethTokenPrice = TokenPrice.load(WETH.toString());
    if (wethTokenPrice !== null) {
      //const poolTokenId = id.concat('-').concat(WETH);
      //const poolToken = PoolToken.load(poolTokenId);
      //poolLiquidity = wethTokenPrice.price.times(poolToken.balance).div(poolToken.denormWeight).times(pool.totalWeight)
      hasPrice = true;
    }
  }

  // Create or update token price

  if (hasPrice) {
    for (let i: i32 = 0; i < tokensList.length; i++) {
      const tokenPriceId = tokensList[i].toHexString();
      let tokenPrice = TokenPrice.load(tokenPriceId);
      if (tokenPrice == null) {
        tokenPrice = new TokenPrice(tokenPriceId);
        //tokenPrice.poolTokenId = '';
        //tokenPrice.poolLiquidity = ZERO_BD;
      }

      const poolTokenId = id.concat('-').concat(tokenPriceId);
      const poolToken = PoolToken.load(poolTokenId);

      if (
        //(tokenPrice.poolTokenId == poolTokenId || poolLiquidity.gt(tokenPrice.poolLiquidity)) &&
        (tokenPriceId != WETH.toString() || (pool.tokensCount.equals(BigInt.fromI32(2)) && hasUsdPrice))
      ) {
        tokenPrice.price = ZERO_BD;

        if (poolToken.balance.gt(ZERO_BD)) {
          //tokenPrice.price = poolLiquidity.div(pool.totalWeight).times(poolToken.denormWeight).div(poolToken.balance) // TODO
        }

        //tokenPrice.symbol = poolToken.symbol;
        //tokenPrice.name = poolToken.name;
        //tokenPrice.decimals = poolToken.decimals;
        //tokenPrice.poolLiquidity = poolLiquidity;
        //tokenPrice.poolTokenId = poolTokenId;
        tokenPrice.save();
      }
    }
  }

  // Update pool liquidity

  const liquidity = ZERO_BD;
  //let denormWeight = ZERO_BD

  for (let i: i32 = 0; i < tokensList.length; i++) {
    const tokenPriceId = tokensList[i].toHexString();
    const tokenPrice = TokenPrice.load(tokenPriceId);
    if (tokenPrice !== null) {
      //const poolTokenId = id.concat('-').concat(tokenPriceId);
      //const poolToken = PoolToken.load(poolTokenId);
      //if (poolToken.denormWeight.gt(denormWeight)) {
      //denormWeight = poolToken.denormWeight // TODO
      //liquidity = tokenPrice.price.times(poolToken.balance).div(poolToken.denormWeight).times(pool.totalWeight)
      //}
    }
  }

  const factory = Balancer.load('1');
  const oldPoolLiquidity = pool.liquidity
  factory.totalLiquidity = factory.totalLiquidity.minus(oldPoolLiquidity).plus(liquidity);
  factory.save();

  pool.liquidity = liquidity;
  pool.save();
}


