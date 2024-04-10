import { ZERO_BD, ZERO, FX_ASSET_AGGREGATORS, VAULT_ADDRESS, ZERO_ADDRESS, ProtocolFeeType } from './helpers/constants';
import {
  getPoolTokenManager,
  getPoolTokens,
  isManagedPool,
  isMetaStableDeprecated,
  PoolType,
  setPriceRateProviders,
} from './helpers/pools';

import {
  newPoolEntity,
  createPoolTokenEntity,
  scaleDown,
  getBalancerSnapshot,
  tokenToDecimal,
  stringToBytes,
  bytesToAddress,
  getProtocolFeeCollector,
  getToken,
  getFXOracle,
} from './helpers/misc';
import { updatePoolWeights } from './helpers/weighted';

import { BigInt, Address, Bytes, ethereum, log } from '@graphprotocol/graph-ts';

import { PoolCreated } from '../types/WeightedPoolFactory/WeightedPoolFactory';
import { AaveLinearPoolCreated } from '../types/AaveLinearPoolV3Factory/AaveLinearPoolV3Factory';
import { ProtocolIdRegistered } from '../types/ProtocolIdRegistry/ProtocolIdRegistry';
import { Balancer, Pool, PoolContract, ProtocolIdData } from '../types/schema';
import { KassandraPoolCreated } from '../types/ManagedKassandraPoolControllerFactory/ManagedKassandraPoolControllerFactory';
import { NewFXPoolDeployer } from '../types/FXPoolDeployerTracker/FXPoolDeployerTracker';

// datasource
import { OffchainAggregator, WeightedPool as WeightedPoolTemplate } from '../types/templates';
import { WeightedPoolV2 as WeightedPoolV2Template } from '../types/templates';
import { WeightedPool2Tokens as WeightedPool2TokensTemplate } from '../types/templates';
import { StablePool as StablePoolTemplate } from '../types/templates';
import { MetaStablePool as MetaStablePoolTemplate } from '../types/templates';
import { StablePhantomPool as StablePhantomPoolTemplate } from '../types/templates';
import { StablePhantomPoolV2 as StablePhantomPoolV2Template } from '../types/templates';
import { ConvergentCurvePool as CCPoolTemplate } from '../types/templates';
import { LiquidityBootstrappingPool as LiquidityBootstrappingPoolTemplate } from '../types/templates';
import { InvestmentPool as InvestmentPoolTemplate } from '../types/templates';
import { ManagedPool as ManagedPoolTemplate } from '../types/templates';
import { LinearPool as LinearPoolTemplate } from '../types/templates';
import { Gyro2Pool as Gyro2PoolTemplate } from '../types/templates';
import { Gyro3Pool as Gyro3PoolTemplate } from '../types/templates';
import { GyroEPool as GyroEPoolTemplate } from '../types/templates';
import { FXPool as FXPoolTemplate } from '../types/templates';
import { FXPoolDeployer as FXPoolDeployerTemplate } from '../types/templates';

import { WeightedPool } from '../types/templates/WeightedPool/WeightedPool';
import { WeightedPoolV2 } from '../types/templates/WeightedPoolV2/WeightedPoolV2';
import { StablePool } from '../types/templates/StablePool/StablePool';
import { ConvergentCurvePool } from '../types/templates/ConvergentCurvePool/ConvergentCurvePool';
import { LinearPool } from '../types/templates/LinearPool/LinearPool';
import { Gyro2V2Pool } from '../types/templates/Gyro2Pool/Gyro2V2Pool';
import { Gyro3Pool } from '../types/templates/Gyro3Pool/Gyro3Pool';
import { GyroEV2Pool } from '../types/templates/GyroEPool/GyroEV2Pool';
import { FXPool } from '../types/templates/FXPool/FXPool';
import { Assimilator } from '../types/FXPoolDeployer/Assimilator';
import { ChainlinkPriceFeed } from '../types/FXPoolDeployer/ChainlinkPriceFeed';
import { OunceToGramOracle } from '../types/templates/FXPoolDeployer/OunceToGramOracle';
import { AggregatorConverter } from '../types/templates/FXPoolDeployer/AggregatorConverter';
import { Transfer } from '../types/Vault/ERC20';
import { handleTransfer, setPriceRateProvider } from './poolController';
import { ComposableStablePool } from '../types/ComposableStablePoolFactory/ComposableStablePool';

function createWeightedLikePool(event: PoolCreated, poolType: string, poolTypeVersion: i32 = 1): string | null {
  let poolAddress: Address = event.params.pool;
  let poolContract = WeightedPool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let swapFeeCall = poolContract.try_getSwapFeePercentage();
  let swapFee = swapFeeCall.value;

  let ownerCall = poolContract.try_getOwner();
  let owner = ownerCall.value;

  let pool = handleNewPool(event, poolId, swapFee);
  pool.poolType = poolType;
  pool.poolTypeVersion = poolTypeVersion;
  pool.owner = owner;

  let tokens = getPoolTokens(poolId);
  if (tokens == null) return null;
  pool.tokensList = tokens;

  if (isManagedPool(pool)) {
    pool.totalAumFeeCollectedInBPT = ZERO_BD;
  }

  // Get protocol fee via on-chain calls since ProtocolFeePercentageCacheUpdated
  // event is emitted before the PoolCreated
  if ((poolType == PoolType.Weighted && poolTypeVersion >= 2) || isManagedPool(pool)) {
    let weightedContract = WeightedPoolV2.bind(poolAddress);

    let protocolSwapFee = weightedContract.try_getProtocolFeePercentageCache(BigInt.fromI32(ProtocolFeeType.Swap));
    let protocolYieldFee = weightedContract.try_getProtocolFeePercentageCache(BigInt.fromI32(ProtocolFeeType.Yield));
    let protocolAumFee = weightedContract.try_getProtocolFeePercentageCache(BigInt.fromI32(ProtocolFeeType.Aum));

    pool.protocolSwapFeeCache = protocolSwapFee.reverted ? null : scaleDown(protocolSwapFee.value, 18);
    pool.protocolYieldFeeCache = protocolYieldFee.reverted ? null : scaleDown(protocolYieldFee.value, 18);
    pool.protocolAumFeeCache = protocolAumFee.reverted ? null : scaleDown(protocolAumFee.value, 18);
  }

  pool.save();

  handleNewPoolTokens(pool, tokens);

  // Load pool with initial weights
  updatePoolWeights(poolId.toHexString());

  // Create PriceRateProvider entities for WeightedPoolV2+
  if (poolType == PoolType.Weighted && poolTypeVersion >= 2) {
    setPriceRateProviders(poolId.toHex(), poolAddress, tokens);
  }

  return poolId.toHexString();
}

export function handleNewWeightedPool(event: PoolCreated): void {
  const pool = createWeightedLikePool(event, PoolType.Weighted);
  if (pool == null) return;
  WeightedPoolTemplate.create(event.params.pool);
}

export function handleNewWeightedPoolV2(event: PoolCreated): void {
  const pool = createWeightedLikePool(event, PoolType.Weighted, 2);
  if (pool == null) return;
  WeightedPoolV2Template.create(event.params.pool);
}

export function handleNewWeightedPoolV3(event: PoolCreated): void {
  const pool = createWeightedLikePool(event, PoolType.Weighted, 3);
  if (pool == null) return;
  WeightedPoolV2Template.create(event.params.pool);
}

export function handleNewWeightedPoolV4(event: PoolCreated): void {
  const pool = createWeightedLikePool(event, PoolType.Weighted, 4);
  if (pool == null) return;
  WeightedPoolV2Template.create(event.params.pool);
}

export function handleNewWeighted2TokenPool(event: PoolCreated): void {
  createWeightedLikePool(event, PoolType.Weighted);
  WeightedPool2TokensTemplate.create(event.params.pool);
}

export function handleNewLiquidityBootstrappingPool(event: PoolCreated): void {
  const pool = createWeightedLikePool(event, PoolType.LiquidityBootstrapping);
  if (pool == null) return;
  LiquidityBootstrappingPoolTemplate.create(event.params.pool);
}

export function handleNewInvestmentPool(event: PoolCreated): void {
  const pool = createWeightedLikePool(event, PoolType.Investment);
  if (pool == null) return;
  InvestmentPoolTemplate.create(event.params.pool);
}

export function handleNewManagedPoolV2(event: PoolCreated): void {
  const pool = createWeightedLikePool(event, PoolType.Managed, 2);
  if (pool == null) return;
  ManagedPoolTemplate.create(event.params.pool);
}

export function handleNewManagedKassandraPool(event: KassandraPoolCreated): void {
  const pool = Pool.load(event.params.vaultPoolId.toHexString());
  if (pool == null) return;
  pool.poolType = PoolType.KassandraManaged;
  pool.save();
}

function createStableLikePool(event: PoolCreated, poolType: string, poolTypeVersion: i32 = 1): string | null {
  let poolAddress: Address = event.params.pool;
  let poolContract = StablePool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let swapFeeCall = poolContract.try_getSwapFeePercentage();
  let swapFee = swapFeeCall.value;

  let ownerCall = poolContract.try_getOwner();
  let owner = ownerCall.value;

  let pool = handleNewPool(event, poolId, swapFee);
  pool.poolType = poolType;
  pool.poolTypeVersion = poolTypeVersion;
  pool.owner = owner;

  let tokens = getPoolTokens(poolId);
  if (tokens == null) return null;
  pool.tokensList = tokens;

  // Get protocol fee via on-chain calls since ProtocolFeePercentageCacheUpdated
  // event is emitted before the PoolCreated
  if (poolType == PoolType.ComposableStable) {
    let composableContract = ComposableStablePool.bind(poolAddress);

    let protocolSwapFee = composableContract.try_getProtocolFeePercentageCache(BigInt.fromI32(ProtocolFeeType.Swap));
    let protocolYieldFee = composableContract.try_getProtocolFeePercentageCache(BigInt.fromI32(ProtocolFeeType.Yield));
    let protocolAumFee = composableContract.try_getProtocolFeePercentageCache(BigInt.fromI32(ProtocolFeeType.Aum));

    pool.protocolSwapFeeCache = protocolSwapFee.reverted ? null : scaleDown(protocolSwapFee.value, 18);
    pool.protocolYieldFeeCache = protocolYieldFee.reverted ? null : scaleDown(protocolYieldFee.value, 18);
    pool.protocolAumFeeCache = protocolAumFee.reverted ? null : scaleDown(protocolAumFee.value, 18);
  }

  pool.save();

  handleNewPoolTokens(pool, tokens);

  return poolId.toHexString();
}

export function handleNewStablePool(event: PoolCreated): void {
  const pool = createStableLikePool(event, PoolType.Stable);
  if (pool == null) return;
  StablePoolTemplate.create(event.params.pool);
}

export function handleNewStablePoolV2(event: PoolCreated): void {
  const pool = createStableLikePool(event, PoolType.Stable, 2);
  if (pool == null) return;
  StablePoolTemplate.create(event.params.pool);
}

export function handleNewMetaStablePool(event: PoolCreated): void {
  if (isMetaStableDeprecated(event.block.number.toI32())) return;

  const pool = createStableLikePool(event, PoolType.MetaStable);
  if (pool == null) return;
  MetaStablePoolTemplate.create(event.params.pool);
}

export function handleNewStablePhantomPool(event: PoolCreated): void {
  const pool = createStableLikePool(event, PoolType.StablePhantom);
  if (pool == null) return;
  StablePhantomPoolTemplate.create(event.params.pool);
}

export function handleNewComposableStablePool(event: PoolCreated): void {
  const pool = createStableLikePool(event, PoolType.ComposableStable);
  if (pool == null) return;
  StablePhantomPoolV2Template.create(event.params.pool);
}

export function handleNewComposableStablePoolV2(event: PoolCreated): void {
  const pool = createStableLikePool(event, PoolType.ComposableStable, 2);
  if (pool == null) return;
  StablePhantomPoolV2Template.create(event.params.pool);
}

export function handleNewComposableStablePoolV3(event: PoolCreated): void {
  const pool = createStableLikePool(event, PoolType.ComposableStable, 3);
  if (pool == null) return;
  StablePhantomPoolV2Template.create(event.params.pool);
}

export function handleNewComposableStablePoolV4(event: PoolCreated): void {
  const pool = createStableLikePool(event, PoolType.ComposableStable, 4);
  if (pool == null) return;
  StablePhantomPoolV2Template.create(event.params.pool);
}

export function handleNewComposableStablePoolV5(event: PoolCreated): void {
  const pool = createStableLikePool(event, PoolType.ComposableStable, 5);
  if (pool == null) return;
  StablePhantomPoolV2Template.create(event.params.pool);
}

export function handleNewComposableStablePoolV6(event: PoolCreated): void {
  const pool = createStableLikePool(event, PoolType.ComposableStable, 6);
  if (pool == null) return;
  StablePhantomPoolV2Template.create(event.params.pool);
}

export function handleNewHighAmpComposableStablePool(event: PoolCreated): void {
  const pool = createStableLikePool(event, PoolType.HighAmpComposableStable);
  if (pool == null) return;
  StablePhantomPoolV2Template.create(event.params.pool);
}

export function handleNewCCPPool(event: PoolCreated): void {
  let poolAddress: Address = event.params.pool;

  let poolContract = ConvergentCurvePool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let swapFeeCall = poolContract.try_percentFee();
  let swapFee = swapFeeCall.value;

  let principalTokenCall = poolContract.try_bond();
  let principalToken = principalTokenCall.value;

  let baseTokenCall = poolContract.try_underlying();
  let baseToken = baseTokenCall.value;

  let expiryTimeCall = poolContract.try_expiration();
  let expiryTime = expiryTimeCall.value;

  let unitSecondsCall = poolContract.try_unitSeconds();
  let unitSeconds = unitSecondsCall.value;

  // let ownerCall = poolContract.try_getOwner();
  // let owner = ownerCall.value;

  let pool = handleNewPool(event, poolId, swapFee);
  pool.poolType = PoolType.Element; // pool.owner = owner;
  pool.principalToken = principalToken;
  pool.baseToken = baseToken;
  pool.expiryTime = expiryTime;
  pool.unitSeconds = unitSeconds;

  let tokens = getPoolTokens(poolId);
  if (tokens == null) return;
  pool.tokensList = tokens;

  pool.save();

  handleNewPoolTokens(pool, tokens);

  CCPoolTemplate.create(poolAddress);
}

export function handleNewAaveLinearPool(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.AaveLinear);
}

export function handleNewAaveLinearPoolV2(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.AaveLinear, 2);
}

export function handleNewAaveLinearPoolV3(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.AaveLinear, 3);
}

export function handleNewAaveLinearPoolV4(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.AaveLinear, 4);
}

export function handleNewAaveLinearPoolV5(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.AaveLinear, 5);
}

export function handleNewERC4626LinearPool(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.ERC4626Linear);
}

export function handleNewERC4626LinearPoolV3(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.ERC4626Linear, 3);
}

export function handleNewERC4626LinearPoolV4(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.ERC4626Linear, 4);
}

export function handleNewEulerLinearPool(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.EulerLinear, 1);
}

export function handleNewGearboxLinearPool(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.GearboxLinear, 1);
}

export function handleNewGearboxLinearPoolV2(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.GearboxLinear, 2);
}

export function handleNewMidasLinearPool(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.EulerLinear, 1);
}

export function handleNewReaperLinearPool(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.ReaperLinear, 1);
}

export function handleNewReaperLinearPoolV2(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.ReaperLinear, 2);
}

export function handleNewReaperLinearPoolV3(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.ReaperLinear, 3);
}

export function handleNewSiloLinearPool(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.SiloLinear, 1);
}

export function handleNewSiloLinearPoolV2(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.SiloLinear, 2);
}

export function handleNewYearnLinearPool(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.YearnLinear, 1);
}

export function handleNewYearnLinearPoolV2(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.YearnLinear, 2);
}

export function handleNewBooLinearPool(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.BooLinear, 1);
}

export function handleNewBooLinearPoolV2(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.BooLinear, 2);
}

export function handleNewTarotLinearPool(event: PoolCreated): void {
  handleNewLinearPool(event, PoolType.TarotLinear, 1);
}

export function handleLinearPoolProtocolId(event: AaveLinearPoolCreated): void {
  let poolAddress = event.params.pool;
  let poolContract = PoolContract.load(poolAddress.toHexString());
  if (poolContract == null) return;

  let pool = Pool.load(poolContract.pool) as Pool;
  pool.protocolId = event.params.protocolId.toI32();
  const protocolIdData = ProtocolIdData.load(event.params.protocolId.toString());
  pool.protocolIdData = protocolIdData ? protocolIdData.id : null;
  pool.save();
}

function handleNewLinearPool(event: PoolCreated, poolType: string, poolTypeVersion: i32 = 1): void {
  let poolAddress: Address = event.params.pool;

  let poolContract = LinearPool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let swapFeeCall = poolContract.try_getSwapFeePercentage();
  let swapFee = swapFeeCall.value;

  let pool = handleNewPool(event, poolId, swapFee);

  pool.poolType = poolType;
  pool.poolTypeVersion = poolTypeVersion;

  let mainIndexCall = poolContract.try_getMainIndex();
  pool.mainIndex = mainIndexCall.value.toI32();
  let wrappedIndexCall = poolContract.try_getWrappedIndex();
  pool.wrappedIndex = wrappedIndexCall.value.toI32();

  let targetsCall = poolContract.try_getTargets();
  pool.lowerTarget = tokenToDecimal(targetsCall.value.value0, 18);
  pool.upperTarget = tokenToDecimal(targetsCall.value.value1, 18);

  let tokens = getPoolTokens(poolId);
  if (tokens == null) return;
  pool.tokensList = tokens;

  // Linear pools premint a large amount of BPTs on creation. This value will be added to totalShares
  // on the handleTransfer handler, so we need to subtract it here
  let preMintedBpt = BigInt.fromString('5192296858534827628530496329220095');
  let scaledPreMintedBpt = scaleDown(preMintedBpt, 18);
  pool.totalShares = pool.totalShares.minus(scaledPreMintedBpt);
  // This amount will also be transferred to the vault,
  // causing the vault's 'user shares' to incorrectly increase,
  // so we need to negate it. We do so by processing a mock transfer event
  // from the vault to the zero address

  let mockEvent = new Transfer(
    bytesToAddress(pool.address),
    event.logIndex,
    event.transactionLogIndex,
    event.logType,
    event.block,
    event.transaction,
    [
      new ethereum.EventParam('from', ethereum.Value.fromAddress(VAULT_ADDRESS)),
      new ethereum.EventParam('to', ethereum.Value.fromAddress(ZERO_ADDRESS)),
      new ethereum.EventParam('value', ethereum.Value.fromUnsignedBigInt(preMintedBpt)),
    ],
    event.receipt
  );
  handleTransfer(mockEvent);
  pool.save();

  handleNewPoolTokens(pool, tokens);

  LinearPoolTemplate.create(poolAddress);
}

function createGyro2Pool(event: PoolCreated, poolTypeVersion: i32 = 1): void {
  let poolAddress: Address = event.params.pool;

  let poolContract = Gyro2V2Pool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let swapFeeCall = poolContract.try_getSwapFeePercentage();
  let swapFee = swapFeeCall.value;

  let pool = handleNewPool(event, poolId, swapFee);

  pool.poolType = PoolType.Gyro2;
  pool.poolTypeVersion = poolTypeVersion;
  let sqrtParamsCall = poolContract.try_getSqrtParameters();
  pool.sqrtAlpha = scaleDown(sqrtParamsCall.value[0], 18);
  pool.sqrtBeta = scaleDown(sqrtParamsCall.value[1], 18);

  let tokens = getPoolTokens(poolId);
  if (tokens == null) return;
  pool.tokensList = tokens;

  if (poolTypeVersion == 2) {
    let rateProvider0Call = poolContract.try_rateProvider0();
    let rateProvider1Call = poolContract.try_rateProvider1();

    let blockTimestamp = event.block.timestamp.toI32();

    if (!rateProvider0Call.reverted) {
      setPriceRateProvider(poolId.toHex(), changetype<Address>(tokens[0]), rateProvider0Call.value, 0, blockTimestamp);
    }
    if (!rateProvider1Call.reverted) {
      setPriceRateProvider(poolId.toHex(), changetype<Address>(tokens[1]), rateProvider1Call.value, 0, blockTimestamp);
    }
  }

  pool.save();

  handleNewPoolTokens(pool, tokens);

  Gyro2PoolTemplate.create(event.params.pool);
}

export function handleNewGyro2Pool(event: PoolCreated): void {
  createGyro2Pool(event);
}

export function handleNewGyro2V2Pool(event: PoolCreated): void {
  createGyro2Pool(event, 2);
}

export function handleNewGyro3Pool(event: PoolCreated): void {
  let poolAddress: Address = event.params.pool;

  let poolContract = Gyro3Pool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let swapFeeCall = poolContract.try_getSwapFeePercentage();
  let swapFee = swapFeeCall.value;

  let pool = handleNewPool(event, poolId, swapFee);

  pool.poolType = PoolType.Gyro3;
  let root3AlphaCall = poolContract.try_getRoot3Alpha();

  if (!root3AlphaCall.reverted) {
    pool.root3Alpha = scaleDown(root3AlphaCall.value, 18);
  }

  let tokens = getPoolTokens(poolId);
  if (tokens == null) return;
  pool.tokensList = tokens;

  pool.save();

  handleNewPoolTokens(pool, tokens);

  Gyro3PoolTemplate.create(event.params.pool);
}

function createGyroEPool(event: PoolCreated, poolTypeVersion: i32 = 1): void {
  let poolAddress: Address = event.params.pool;
  let poolContract = GyroEV2Pool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let swapFeeCall = poolContract.try_getSwapFeePercentage();
  let swapFee = swapFeeCall.value;

  let pool = handleNewPool(event, poolId, swapFee);

  pool.poolType = PoolType.GyroE;
  pool.poolTypeVersion = poolTypeVersion;
  let eParamsCall = poolContract.try_getECLPParams();

  if (!eParamsCall.reverted) {
    const params = eParamsCall.value.value0;
    const derived = eParamsCall.value.value1;
    pool.alpha = scaleDown(params.alpha, 18);
    pool.beta = scaleDown(params.beta, 18);
    pool.c = scaleDown(params.c, 18);
    pool.s = scaleDown(params.s, 18);
    pool.lambda = scaleDown(params.lambda, 18);

    // terms in the 'derived' object are stored in extra precision (38 decimals) with final decimal rounded down
    pool.tauAlphaX = scaleDown(derived.tauAlpha.x, 38);
    pool.tauAlphaY = scaleDown(derived.tauAlpha.y, 38);
    pool.tauBetaX = scaleDown(derived.tauBeta.x, 38);
    pool.tauBetaY = scaleDown(derived.tauBeta.y, 38);
    pool.u = scaleDown(derived.u, 38);
    pool.v = scaleDown(derived.v, 38);
    pool.w = scaleDown(derived.w, 38);
    pool.z = scaleDown(derived.z, 38);
    pool.dSq = scaleDown(derived.dSq, 38);
  }

  let tokens = getPoolTokens(poolId);
  if (tokens == null) return;
  pool.tokensList = tokens;

  if (poolTypeVersion == 2) {
    let rateProvider0Call = poolContract.try_rateProvider0();
    let rateProvider1Call = poolContract.try_rateProvider1();

    let blockTimestamp = event.block.timestamp.toI32();

    if (!rateProvider0Call.reverted) {
      setPriceRateProvider(poolId.toHex(), changetype<Address>(tokens[0]), rateProvider0Call.value, 0, blockTimestamp);
    }
    if (!rateProvider1Call.reverted) {
      setPriceRateProvider(poolId.toHex(), changetype<Address>(tokens[1]), rateProvider1Call.value, 0, blockTimestamp);
    }
  }

  pool.save();

  handleNewPoolTokens(pool, tokens);

  GyroEPoolTemplate.create(event.params.pool);
}

export function handleNewGyroEPool(event: PoolCreated): void {
  createGyroEPool(event);
}

export function handleNewGyroEV2Pool(event: PoolCreated): void {
  createGyroEPool(event, 2);
}

export function handleNewFXPoolDeployer(event: NewFXPoolDeployer): void {
  FXPoolDeployerTemplate.create(event.params.deployer);
}

export function handleNewFXPoolV1(event: ethereum.Event): void {
  return handleNewFXPool(event, false);
}

export function handleNewFXPoolV2(event: ethereum.Event): void {
  return handleNewFXPool(event, true);
}

function handleNewFXPool(event: ethereum.Event, permissionless: boolean): void {
  /**
   * FXPoolFactory/FXPoolDeployer emits a custom NewFXPool event with the following params:
   *   event.parameters[0] = caller
   *   event.parameters[1] = id (vault poolId)
   *   event.parameters[2] = fxpool (pool address)
   * */
  let poolId = event.parameters[1].value.toBytes();
  let poolAddress = event.parameters[2].value.toAddress();
  let swapFee = ZERO; // fee is calculated on every swap

  // Create a PoolCreated event from generic ethereum.Event
  const poolCreatedEvent = new PoolCreated(
    event.address,
    event.logIndex,
    event.transactionLogIndex,
    event.logType,
    event.block,
    event.transaction,
    [event.parameters[2]], // PoolCreated expects parameters[0] to be the pool address
    event.receipt
  );

  let pool = handleNewPool(poolCreatedEvent, poolId, swapFee);

  pool.poolType = PoolType.FX;

  let tokens = getPoolTokens(poolId);
  if (tokens == null) return;
  pool.tokensList = tokens;

  pool.save();

  handleNewPoolTokens(pool, tokens);

  FXPoolTemplate.create(poolAddress);

  // Create templates for each token Offchain Aggregator
  let tokensAddresses: Address[] = changetype<Address[]>(tokens);

  if (!permissionless) {
    // For FXPoolFactory, use hardcoded aggregator addresses
    tokensAddresses.forEach((tokenAddress) => {
      for (let i = 0; i < FX_ASSET_AGGREGATORS.length; i++) {
        if (FX_ASSET_AGGREGATORS[i][0] == tokenAddress) {
          OffchainAggregator.create(FX_ASSET_AGGREGATORS[i][1]);
          break;
        }
      }
    });
  } else {
    // For FXPoolDeployer (permissionless), fetch the aggregator address dynamically
    let poolContract = FXPool.bind(poolAddress);

    for (let i = 0; i < tokensAddresses.length; i++) {
      let tokenAddress = tokensAddresses[i];
      let assimCall = poolContract.try_assimilator(tokenAddress);
      if (assimCall.reverted) continue;

      let assimContract = Assimilator.bind(assimCall.value);
      let oracleCall = assimContract.try_oracle();
      if (oracleCall.reverted) continue;

      let oracleContract = ChainlinkPriceFeed.bind(oracleCall.value);
      let aggregatorCall = oracleContract.try_aggregator();
      if (aggregatorCall.reverted) continue;

      // Create OffchainAggregator template
      let aggregatorAddress = aggregatorCall.value;
      OffchainAggregator.create(aggregatorAddress);

      // Update FXOracle supported tokens
      let oracle = getFXOracle(aggregatorAddress);
      let tokenAddresses = oracle.tokens;
      const tokenExists = tokenAddresses.includes(tokenAddress);
      if (!tokenExists) {
        tokenAddresses.push(tokenAddress);
      }

      // some oracles have a conversion rate
      // eg. metal token oracles like Gold tokens are expressed in grams but the Chainlink
      // oracle returns the price in troy ounces. We need to convert the price to grams
      const gramPerTroyOunceCall = OunceToGramOracle.bind(oracleCall.value).try_GRAM_PER_TROYOUNCE();
      if (!gramPerTroyOunceCall.reverted) {
        // VNXAUGramOracle.sol oracle convertor (deprecated)
        oracle.decimals = BigInt.fromString('8').toI32();
        oracle.divisor = gramPerTroyOunceCall.value.toString();
      } else {
        // AggregatorConverter (current version)
        // if the Oracle contract has a DIVISOR and DECIMALS function, it is an AggregatorConverter contract
        const aggregatorConverterDivisorCall = AggregatorConverter.bind(oracleCall.value).try_DIVISOR();
        if (!aggregatorConverterDivisorCall.reverted) {
          const divisor = aggregatorConverterDivisorCall.value;
          const aggregatorConverterDecimalsCall = AggregatorConverter.bind(oracleCall.value).try_DECIMALS();
          if (!aggregatorConverterDecimalsCall.reverted) {
            const decimals = aggregatorConverterDecimalsCall.value;
            oracle.decimals = decimals.toI32();
            oracle.divisor = divisor.toString();
          }
        }
      }

      oracle.tokens = tokenAddresses;
      oracle.save();
    }
  }
}

function findOrInitializeVault(): Balancer {
  let vault: Balancer | null = Balancer.load('2');
  if (vault != null) return vault;

  // if no vault yet, set up blank initial
  vault = new Balancer('2');
  vault.poolCount = 0;
  vault.totalLiquidity = ZERO_BD;
  vault.totalSwapVolume = ZERO_BD;
  vault.totalSwapFee = ZERO_BD;
  vault.totalSwapCount = ZERO;

  // set up protocol fees collector
  vault.protocolFeesCollector = getProtocolFeeCollector();

  return vault;
}

function handleNewPool(event: PoolCreated, poolId: Bytes, swapFee: BigInt): Pool {
  let poolAddress: Address = event.params.pool;

  let pool = Pool.load(poolId.toHexString());
  if (pool == null) {
    pool = newPoolEntity(poolId.toHexString());

    pool.swapFee = scaleDown(swapFee, 18);
    pool.createTime = event.block.timestamp.toI32();
    pool.address = poolAddress;
    pool.factory = event.address;
    pool.oracleEnabled = false;
    pool.tx = event.transaction.hash;
    pool.swapEnabled = true;
    pool.swapEnabledInternal = true;
    pool.isPaused = false;

    let bpt = getToken(poolAddress);

    pool.name = bpt.name;
    pool.symbol = bpt.symbol;

    pool.save();

    let vault = findOrInitializeVault();
    vault.poolCount += 1;
    vault.save();

    let vaultSnapshot = getBalancerSnapshot(vault.id, event.block.timestamp.toI32());
    vaultSnapshot.poolCount += 1;
    vaultSnapshot.save();
  }

  let poolContract = PoolContract.load(poolAddress.toHexString());
  if (poolContract == null) {
    poolContract = new PoolContract(poolAddress.toHexString());
    poolContract.pool = poolId.toHexString();
    poolContract.save();
  }

  return pool;
}

function handleNewPoolTokens(pool: Pool, tokens: Bytes[]): void {
  let tokensAddresses = changetype<Address[]>(tokens);

  for (let i: i32 = 0; i < tokens.length; i++) {
    let poolId = stringToBytes(pool.id);
    let assetManager = getPoolTokenManager(poolId, tokens[i]);

    if (!assetManager) continue;

    createPoolTokenEntity(pool, tokensAddresses[i], i, assetManager);
  }
}

export function handleProtocolIdRegistryOrRename(event: ProtocolIdRegistered): void {
  let protocol = ProtocolIdData.load(event.params.protocolId.toString());

  if (protocol == null) {
    protocol = new ProtocolIdData(event.params.protocolId.toString());
    protocol.name = event.params.name;
  } else {
    protocol.name = event.params.name;
  }
  protocol.save();
}
