import { LogArgument } from '../types/EventEmitter/EventEmitter';
import { Pool } from '../types/schema';

export function handleLogArgument(event: LogArgument): void {
  const identifier = event.params.identifier;

  if (identifier == 'setSwapEnabledTrue') {
    const poolId = event.params.message.toHexString();
    const pool = Pool.load(poolId);

    if (!pool) return;

    pool.swapEnabled = true;
    pool.save();
  }

  if (identifier == 'setSwapEnabledFalse') {
    const poolId = event.params.message.toHexString();
    const pool = Pool.load(poolId);

    if (!pool) return;

    pool.swapEnabled = false;
    pool.save();
  }
}
