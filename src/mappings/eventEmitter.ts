import { LogArgument } from '../types/EventEmitter/EventEmitter';
import { Pool } from '../types/schema';
import { computeCuratedSwapEnabled } from './helpers/misc';
import { poolTypes } from './helpers/pools';

export function handleLogArgument(event: LogArgument): void {
  const identifier = event.params.identifier.toHexString();

  // convention: identifier = keccak256(function_name)
  // keccak256(setSwapEnabled) = 0xe84220e19c54dd2a96deb4cb59ea58e10e36ae2e5c0887f3af0a1ac8e04b0e29
  if (identifier == '0xe84220e19c54dd2a96deb4cb59ea58e10e36ae2e5c0887f3af0a1ac8e04b0e29') {
    setSwapEnabled(event);
  }
  // keccak256(setPoolType) = 0x23462a935a3b72f9098a1e3b21d6506d4a63139cb3b4c372a5df6fdde64cf80d
  if (identifier == '0x23462a935a3b72f9098a1e3b21d6506d4a63139cb3b4c372a5df6fdde64cf80d') {
    setPoolType(event);
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
    pool.swapEnabledCurationSignal = false;
    pool.swapEnabled = false;
  } else {
    pool.swapEnabledCurationSignal = true;
    pool.swapEnabled = computeCuratedSwapEnabled(pool.isPaused, true, pool.swapEnabledInternal);
  }
  pool.save();
}

function setPoolType(event: LogArgument): void {
  /**
   * Sets a pool's poolType attribute
   *
   * @param message - The pool id (eg. 0x12345abce... - all lowercase)
   * @param value - pool type index/position in the poolTypes array
   */ //

  const poolTypeIndex = event.params.value.toI32();
  if (poolTypeIndex < 0 || poolTypeIndex >= poolTypes.length) return;

  const poolId = event.params.message.toHexString();
  const pool = Pool.load(poolId);
  if (!pool) return;

  pool.poolType = poolTypes[poolTypeIndex];
  pool.save();
}
