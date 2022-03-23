import { Transfer } from '../../types/templates/WeightedPool/BalancerPoolToken';
import { WeightedPool, SwapFeePercentageChanged } from '../../types/templates/WeightedPool/WeightedPool';
import {
  GradualWeightUpdateScheduled,
  SwapEnabledSet,
} from '../../types/templates/LiquidityBootstrappingPool/LiquidityBootstrappingPool';
import { ManagementFeePercentageChanged } from '../../types/templates/InvestmentPool/InvestmentPool';
import { TargetsSet } from '../../types/templates/LinearPool/LinearPool';
import {
  AmpUpdateStarted,
  AmpUpdateStopped,
  PriceRateCacheUpdated,
  PriceRateProviderSet,
} from '../../types/templates/MetaStablePool/MetaStablePool';
import { GradualWeightUpdate, AmpUpdate } from '../../types/schema';

import { getPoolId } from '../../helpers/misc';

import * as coreHandlers from '../core/poolController';

/************************************
 *********** SWAP ENABLED ***********
 ************************************/

export function handleSwapEnabledSet(event: SwapEnabledSet): void {
  coreHandlers.handleSwapEnabledSet(event);
}

/************************************
 ********** WEIGHT UPDATES **********
 ************************************/

export function handleGradualWeightUpdateScheduled(event: GradualWeightUpdateScheduled): void {
  let poolAddress = event.address;

  // TODO - refactor so pool -> poolId doesn't require call
  let poolContract = WeightedPool.bind(poolAddress);
  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let id = event.transaction.hash.toHexString().concat(event.transactionLogIndex.toString());
  let weightUpdate = new GradualWeightUpdate(id);
  weightUpdate.poolId = poolId.toHexString();
  weightUpdate.scheduledTimestamp = event.block.timestamp.toI32();
  weightUpdate.startTimestamp = event.params.startTime;
  weightUpdate.endTimestamp = event.params.endTime;
  weightUpdate.startWeights = event.params.startWeights;
  weightUpdate.endWeights = event.params.endWeights;
  weightUpdate.save();
}

/************************************
 *********** AMP UPDATES ************
 ************************************/

export function handleAmpUpdateStarted(event: AmpUpdateStarted): void {
  coreHandlers.handleAmpUpdateStarted(event);

  let poolId = getPoolId(event.address);
  let id = event.transaction.hash.toHexString().concat(event.transactionLogIndex.toString());
  let ampUpdate = new AmpUpdate(id);
  ampUpdate.poolId = poolId;
  ampUpdate.scheduledTimestamp = event.block.timestamp.toI32();
  ampUpdate.startTimestamp = event.params.startTime;
  ampUpdate.endTimestamp = event.params.endTime;
  ampUpdate.startAmp = event.params.startValue;
  ampUpdate.endAmp = event.params.endValue;
  ampUpdate.save();
}

export function handleAmpUpdateStopped(event: AmpUpdateStopped): void {
  coreHandlers.handleAmpUpdateStopped(event);

  let poolId = getPoolId(event.address);
  let id = event.transaction.hash.toHexString().concat(event.transactionLogIndex.toString());
  let ampUpdate = new AmpUpdate(id);
  ampUpdate.poolId = poolId;
  ampUpdate.scheduledTimestamp = event.block.timestamp.toI32();
  ampUpdate.startTimestamp = event.block.timestamp;
  ampUpdate.endTimestamp = event.block.timestamp;
  ampUpdate.startAmp = event.params.currentValue;
  ampUpdate.endAmp = event.params.currentValue;
  ampUpdate.save();
}

/************************************
 *********** SWAP FEES ************
 ************************************/

export function handleSwapFeePercentageChange(event: SwapFeePercentageChanged): void {
  coreHandlers.handleSwapFeePercentageChange(event);
}

/************************************
 ********* MANAGEMENT FEES **********
 ************************************/

export function handleManagementFeePercentageChanged(event: ManagementFeePercentageChanged): void {
  coreHandlers.handleManagementFeePercentageChanged(event);
}

/************************************
 ************* TARGETS **************
 ************************************/

export function handleTargetsSet(event: TargetsSet): void {
  coreHandlers.handleTargetsSet(event);
}

/************************************
 ******** PRICE RATE UPDATE *********
 ************************************/

export function handlePriceRateProviderSet(event: PriceRateProviderSet): void {
  coreHandlers.handlePriceRateProviderSet(event);
}

export function handlePriceRateCacheUpdated(event: PriceRateCacheUpdated): void {
  coreHandlers.handlePriceRateCacheUpdated(event);
}

/************************************
 *********** POOL SHARES ************
 ************************************/

export function handleTransfer(event: Transfer): void {
  coreHandlers.handleTransfer(event);
}
