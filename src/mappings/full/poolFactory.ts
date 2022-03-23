import { PoolCreated } from '../../types/WeightedPoolFactory/WeightedPoolFactory';

import * as coreHandlers from '../core/poolFactory';

export function handleNewWeightedPool(event: PoolCreated): void {
  coreHandlers.handleNewWeightedPool(event);
}

export function handleNewLiquidityBootstrappingPool(event: PoolCreated): void {
  coreHandlers.handleNewLiquidityBootstrappingPool(event);
}

export function handleNewInvestmentPool(event: PoolCreated): void {
  coreHandlers.handleNewInvestmentPool(event);
}

export function handleNewStablePool(event: PoolCreated): void {
  coreHandlers.handleNewStablePool(event);
}

export function handleNewMetaStablePool(event: PoolCreated): void {
  coreHandlers.handleNewMetaStablePool(event);
}

export function handleNewStablePhantomPool(event: PoolCreated): void {
  coreHandlers.handleNewStablePhantomPool(event);
}

export function handleNewCCPPool(event: PoolCreated): void {
  coreHandlers.handleNewCCPPool(event);
}

export function handleNewAaveLinearPool(event: PoolCreated): void {
  coreHandlers.handleNewAaveLinearPool(event);
}

export function handleNewERC4626LinearPool(event: PoolCreated): void {
  coreHandlers.handleNewERC4626LinearPool(event);
}
