import { LogArgument } from '../types/EventEmitter/EventEmitter';
import { Pool } from '../types/schema';

export function handleLogArgument(event: LogArgument): void {
  const identifier = event.params.identifier.toHexString();

  if (identifier == '0xe84220e19c54dd2a96deb4cb59ea58e10e36ae2e5c0887f3af0a1ac8e04b0e29') {
    setSwapEnabled(event);
  }
}

function setSwapEnabled(event: LogArgument): void {
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
