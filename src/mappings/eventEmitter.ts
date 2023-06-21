import { LogArgument } from '../types/EventEmitter/EventEmitter';
import { Balancer, Pool, Token } from '../types/schema';
import { BigDecimal } from '@graphprotocol/graph-ts';

export function handleLogArgument(event: LogArgument): void {
  const identifier = event.params.identifier.toHexString();

  // convention: identifier = keccak256(function_name)
  // keccak256(setSwapEnabled) = 0xe84220e19c54dd2a96deb4cb59ea58e10e36ae2e5c0887f3af0a1ac8e04b0e29
  if (identifier == '0xe84220e19c54dd2a96deb4cb59ea58e10e36ae2e5c0887f3af0a1ac8e04b0e29') {
    setSwapEnabled(event);
  }
  // keccak256(setLatestUSDPrice) = 0x205869a4266a1bbcc5e2e5255221a32636b162e29887138cc0a8ba5141d05c62
  if (identifier == '0x205869a4266a1bbcc5e2e5255221a32636b162e29887138cc0a8ba5141d05c62') {
    setLatestUSDPrice(event);
  }
  // keccak256(setPricingAsset) = 0x4ea49680c1cdd907804ee836691e5985fb50729a35ec2943d1ba5878a961e64f
  if (identifier == '0x4ea49680c1cdd907804ee836691e5985fb50729a35ec2943d1ba5878a961e64f') {
    setPricingAsset(event);
  }
}

function setSwapEnabled(event: LogArgument): void {
  /**
   * Sets a pool's swapEnabled attribute
   *
   * @param message - The pool id (eg. 0x12345abce... - all lowercase)
   * @param value - 0 if swapEnabled is to be set false; any other value sets it to true
   */ //
  const poolId = event.params.message.toHexString();
  const pool = Pool.load(poolId);
  if (!pool) return;

  if (event.params.value.toI32() == 0) {
    pool.swapEnabled = false;
  } else {
    pool.swapEnabled = true;
  }
  pool.save();
}

function setLatestUSDPrice(event: LogArgument): void {
  /**
   * Sets a token's latestUSDPrice attribute
   *
   * @param message - The token address (eg. 0x12345abce... - all lowercase)
   * @param value - token price in cents of USD (ie, a value of 1 represents $0.01)
   */ //
  const tokenAddress = event.params.message.toHexString();
  const token = Token.load(tokenAddress);
  if (!token) return;

  const base = BigDecimal.fromString('100');
  token.latestUSDPrice = event.params.value.toBigDecimal().div(base);
  token.save();
}

function setPricingAsset(event: LogArgument): void {
  /**
   * Set given token as pricing and/or stable asset
   *
   * @param message - token address (eg. 0x12345abce... - all lowercase)
   * @param value - 1 if token is usd stable asset; any other value will only set it as pricing asset
   */ //
  const vault = Balancer.load('2');
  if (!vault) return;

  const tokenAddress = event.params.message;
  vault.pricingAssets = vault.pricingAssets.concat(tokenAddress);
  if (event.params.value.toI32() == 1) {
    vault.stableAssets = vault.stableAssets.concat(tokenAddress);
  }
  vault.save();
}
