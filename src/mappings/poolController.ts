import { BigInt, log } from '@graphprotocol/graph-ts';
import { Transfer } from '../types/templates/WeightedPool/BalancerPoolToken';
import { WeightedPool, SwapFeePercentageChanged } from '../types/templates/WeightedPool/WeightedPool';
import {
  GradualWeightUpdateScheduled,
  SwapEnabledSet,
} from '../types/templates/LiquidityBootstrappingPool/LiquidityBootstrappingPool';
import { ManagementFeePercentageChanged } from '../types/templates/InvestmentPool/InvestmentPool';
import { TargetsSet } from '../types/templates/LinearPool/LinearPool';
import {
  AmpUpdateStarted,
  AmpUpdateStopped,
  MetaStablePool,
  PriceRateCacheUpdated,
  PriceRateProviderSet,
} from '../types/templates/MetaStablePool/MetaStablePool';
import { Pool, PriceRateProvider, GradualWeightUpdate, AmpUpdate } from '../types/schema';

import {
  tokenToDecimal,
  scaleDown,
  loadPoolToken,
  getPoolTokenId,
  loadPriceRateProvider,
  getPoolShare,
} from './helpers/misc';
import { ONE_BD, ZERO_ADDRESS, ZERO_BD } from './helpers/constants';
import { updateAmpFactor } from './helpers/stable';

/************************************
 *********** SWAP ENABLED ***********
 ************************************/

export function handleSwapEnabledSet(event: SwapEnabledSet): void {
  let poolAddress = event.address;

  // TODO - refactor so pool -> poolId doesn't require call
  let poolContract = WeightedPool.bind(poolAddress);
  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let pool = Pool.load(poolId.toHexString()) as Pool;

  pool.swapEnabled = event.params.swapEnabled;
  pool.save();
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
  let poolAddress = event.address;

  // TODO - refactor so pool -> poolId doesn't require call
  let poolContract = WeightedPool.bind(poolAddress);
  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let id = event.transaction.hash.toHexString().concat(event.transactionLogIndex.toString());
  let ampUpdate = new AmpUpdate(id);
  ampUpdate.poolId = poolId.toHexString();
  ampUpdate.scheduledTimestamp = event.block.timestamp.toI32();
  ampUpdate.startTimestamp = event.params.startTime;
  ampUpdate.endTimestamp = event.params.endTime;
  ampUpdate.startAmp = event.params.startValue;
  ampUpdate.endAmp = event.params.endValue;
  ampUpdate.save();
}

export function handleAmpUpdateStopped(event: AmpUpdateStopped): void {
  let poolAddress = event.address;

  // TODO - refactor so pool -> poolId doesn't require call
  let poolContract = WeightedPool.bind(poolAddress);
  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value.toHexString();

  let id = event.transaction.hash.toHexString().concat(event.transactionLogIndex.toString());
  let ampUpdate = new AmpUpdate(id);
  ampUpdate.poolId = poolId;
  ampUpdate.scheduledTimestamp = event.block.timestamp.toI32();
  ampUpdate.startTimestamp = event.block.timestamp;
  ampUpdate.endTimestamp = event.block.timestamp;
  ampUpdate.startAmp = event.params.currentValue;
  ampUpdate.endAmp = event.params.currentValue;
  ampUpdate.save();

  let pool = Pool.load(poolId);
  if (pool == null) return;
  updateAmpFactor(pool);
}

/************************************
 *********** SWAP FEES ************
 ************************************/

export function handleSwapFeePercentageChange(event: SwapFeePercentageChanged): void {
  let poolAddress = event.address;

  // TODO - refactor so pool -> poolId doesn't require call
  let poolContract = WeightedPool.bind(poolAddress);
  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let pool = Pool.load(poolId.toHexString()) as Pool;

  pool.swapFee = scaleDown(event.params.swapFeePercentage, 18);
  pool.save();
}

/************************************
 ********* MANAGEMENT FEES **********
 ************************************/

export function handleManagementFeePercentageChanged(event: ManagementFeePercentageChanged): void {
  let poolAddress = event.address;

  // TODO - refactor so pool -> poolId doesn't require call
  let poolContract = WeightedPool.bind(poolAddress);
  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let pool = Pool.load(poolId.toHexString()) as Pool;

  pool.managementFee = scaleDown(event.params.managementFeePercentage, 18);
  pool.save();
}

/************************************
 ************* TARGETS **************
 ************************************/

export function handleTargetsSet(event: TargetsSet): void {
  let poolAddress = event.address;

  // TODO - refactor so pool -> poolId doesn't require call
  let poolContract = WeightedPool.bind(poolAddress);
  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let pool = Pool.load(poolId.toHexString()) as Pool;

  pool.lowerTarget = tokenToDecimal(event.params.lowerTarget, 18);
  pool.upperTarget = tokenToDecimal(event.params.upperTarget, 18);
  pool.save();
}

/************************************
 ******** PRICE RATE UPDATE *********
 ************************************/

export function handlePriceRateProviderSet(event: PriceRateProviderSet): void {
  let poolAddress = event.address;

  // TODO - refactor so pool -> poolId doesn't require call
  let poolContract = MetaStablePool.bind(poolAddress);
  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let blockTimestamp = event.block.timestamp.toI32();

  let provider = loadPriceRateProvider(poolId.toHexString(), event.params.token);
  if (provider == null) {
    // Price rate providers and pooltokens share an ID
    let providerId = getPoolTokenId(poolId.toHexString(), event.params.token);
    provider = new PriceRateProvider(providerId);
    provider.poolId = poolId.toHexString();
    provider.token = providerId;

    // Default to a rate of one, this should be updated in `handlePriceRateCacheUpdated` immediately
    provider.rate = ONE_BD;
    provider.lastCached = blockTimestamp;
    provider.cacheExpiry = blockTimestamp + event.params.cacheDuration.toI32();
  }

  provider.address = event.params.provider;
  provider.cacheDuration = event.params.cacheDuration.toI32();

  provider.save();
}

export function handlePriceRateCacheUpdated(event: PriceRateCacheUpdated): void {
  let poolAddress = event.address;

  // TODO - refactor so pool -> poolId doesn't require call
  let poolContract = MetaStablePool.bind(poolAddress);
  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let provider = loadPriceRateProvider(poolId.toHexString(), event.params.token);
  if (provider == null) {
    log.warning('Provider not found in handlePriceRateCacheUpdated: {} {}', [
      poolId.toHexString(),
      event.params.token.toHexString(),
    ]);
    return;
  }

  provider.rate = scaleDown(event.params.rate, 18);
  provider.lastCached = event.block.timestamp.toI32();
  provider.cacheExpiry = event.block.timestamp.toI32() + provider.cacheDuration;

  provider.save();

  // Attach the rate onto the PoolToken entity as well
  let poolToken = loadPoolToken(poolId.toHexString(), event.params.token);
  if (poolToken == null) return;
  poolToken.priceRate = provider.rate;
  poolToken.save();
}

/************************************
 *********** POOL SHARES ************
 ************************************/

export function handleTransfer(event: Transfer): void {
  let poolAddress = event.address;

  // TODO - refactor so pool -> poolId doesn't require call
  let poolContract = WeightedPool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let isMint = event.params.from == ZERO_ADDRESS;
  let isBurn = event.params.to == ZERO_ADDRESS;

  let poolShareFrom = getPoolShare(poolId.toHexString(), event.params.from);
  let poolShareFromBalance = poolShareFrom == null ? ZERO_BD : poolShareFrom.balance;

  let poolShareTo = getPoolShare(poolId.toHexString(), event.params.to);
  let poolShareToBalance = poolShareTo == null ? ZERO_BD : poolShareTo.balance;

  let pool = Pool.load(poolId.toHexString()) as Pool;

  let BPT_DECIMALS = 18;

  if (isMint) {
    poolShareTo.balance = poolShareTo.balance.plus(tokenToDecimal(event.params.value, BPT_DECIMALS));
    poolShareTo.save();
    pool.totalShares = pool.totalShares.plus(tokenToDecimal(event.params.value, BPT_DECIMALS));
  } else if (isBurn) {
    poolShareFrom.balance = poolShareFrom.balance.minus(tokenToDecimal(event.params.value, BPT_DECIMALS));
    poolShareFrom.save();
    pool.totalShares = pool.totalShares.minus(tokenToDecimal(event.params.value, BPT_DECIMALS));
  } else {
    poolShareTo.balance = poolShareTo.balance.plus(tokenToDecimal(event.params.value, BPT_DECIMALS));
    poolShareTo.save();

    poolShareFrom.balance = poolShareFrom.balance.minus(tokenToDecimal(event.params.value, BPT_DECIMALS));
    poolShareFrom.save();
  }

  if (poolShareTo !== null && poolShareTo.balance.notEqual(ZERO_BD) && poolShareToBalance.equals(ZERO_BD)) {
    pool.holdersCount = pool.holdersCount.plus(BigInt.fromI32(1));
  }

  if (poolShareFrom !== null && poolShareFrom.balance.equals(ZERO_BD) && poolShareFromBalance.notEqual(ZERO_BD)) {
    pool.holdersCount = pool.holdersCount.minus(BigInt.fromI32(1));
  }

  pool.save();
}
