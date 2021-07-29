import { ZERO_BD, VAULT_ADDRESS, PoolType } from './helpers/constants';
import { newPoolEntity, createPoolTokenEntity, scaleDown, loadPoolToken } from './helpers/misc';
import { updatePoolWeights } from './helpers/weighted';

import { BigInt, Address, Bytes } from '@graphprotocol/graph-ts';
import { PoolCreated } from '../types/WeightedPoolFactory/WeightedPoolFactory';
import { Balancer, Pool } from '../types/schema';

// datasource
import { WeightedPool as WeightedPoolTemplate } from '../types/templates';
import { StablePool as StablePoolTemplate } from '../types/templates';
import { ConvergentCurvePool as CCPoolTemplate } from '../types/templates';
import { LiquidityBootstrappingPool as LiquidityBootstrappingPoolTemplate } from '../types/templates';

import { Vault } from '../types/Vault/Vault';
import { WeightedPool } from '../types/templates/WeightedPool/WeightedPool';
import { StablePool } from '../types/templates/StablePool/StablePool';
import { ConvergentCurvePool } from '../types/templates/ConvergentCurvePool/ConvergentCurvePool';
import { ERC20 } from '../types/Vault/ERC20';

function createNewWeightedPool(event: PoolCreated): string {
  let poolAddress: Address = event.params.pool;
  let poolContract = WeightedPool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let swapFeeCall = poolContract.try_getSwapFeePercentage();
  let swapFee = swapFeeCall.value;

  let ownerCall = poolContract.try_getOwner();
  let owner = ownerCall.value;

  let pool = handleNewPool(event, poolId, swapFee) as Pool;
  pool.poolType = PoolType.Weighted;
  pool.factory = event.address;
  pool.owner = owner;

  let vaultContract = Vault.bind(VAULT_ADDRESS);
  let tokensCall = vaultContract.try_getPoolTokens(poolId);

  if (!tokensCall.reverted) {
    let tokens = tokensCall.value.value0;
    let tokensList = pool.tokensList;

    for (let i: i32 = 0; i < tokens.length; i++) {
      let tokenAddress = tokens[i];

      if (tokensList.indexOf(tokenAddress) == -1) {
        tokensList.push(tokenAddress);
      }

      createPoolTokenEntity(poolId.toHexString(), tokenAddress);
    }

    pool.tokensList = tokensList;
  }
  pool.save();

  // Load pool with initial weights
  updatePoolWeights(poolId.toHexString());

  return poolId.toHexString();
}

export function handleNewWeightedPool(event: PoolCreated): void {
  createNewWeightedPool(event);
  WeightedPoolTemplate.create(event.params.pool);
}

export function handleNewLiquidityBootstrappingPool(event: PoolCreated): void {
  let poolId = createNewWeightedPool(event);

  let pool = Pool.load(poolId);
  pool.poolType = PoolType.LiquidityBootstrapping;
  pool.save();

  LiquidityBootstrappingPoolTemplate.create(pool.address as Address);
}

export function handleNewStablePool(event: PoolCreated): void {
  let poolAddress: Address = event.params.pool;
  let poolContract = StablePool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let swapFeeCall = poolContract.try_getSwapFeePercentage();
  let swapFee = swapFeeCall.value;

  let ownerCall = poolContract.try_getOwner();
  let owner = ownerCall.value;

  let pool = handleNewPool(event, poolId, swapFee);
  pool.poolType = PoolType.Stable;
  pool.factory = event.address;
  pool.owner = owner;

  let vaultContract = Vault.bind(VAULT_ADDRESS);
  let tokensCall = vaultContract.try_getPoolTokens(poolId);

  if (!tokensCall.reverted) {
    let tokens = tokensCall.value.value0;
    pool.tokensList = tokens as Bytes[];

    for (let i: i32 = 0; i < tokens.length; i++) {
      createPoolTokenEntity(poolId.toHexString(), tokens[i]);
    }
  }

  let ampCall = poolContract.try_getAmplificationParameter();
  if (!ampCall.reverted) {
    let value = ampCall.value.value0;
    let precision = ampCall.value.value2;
    let amp = value.div(precision);
    pool.amp = amp;
  }

  pool.save();

  StablePoolTemplate.create(poolAddress);
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

  let pool = handleNewPool(event, poolId, swapFee) as Pool;
  pool.poolType = PoolType.Element;
  pool.factory = event.address;
  // pool.owner = owner;
  pool.principalToken = principalToken;
  pool.baseToken = baseToken;
  pool.expiryTime = expiryTime;
  pool.unitSeconds = unitSeconds;

  let vaultContract = Vault.bind(VAULT_ADDRESS);
  let tokensCall = vaultContract.try_getPoolTokens(poolId);

  if (!tokensCall.reverted) {
    let tokens = tokensCall.value.value0;
    let tokensList = pool.tokensList;

    for (let i: i32 = 0; i < tokens.length; i++) {
      let tokenAddress = tokens[i];

      if (tokensList.indexOf(tokenAddress) == -1) {
        tokensList.push(tokenAddress);
      }

      createPoolTokenEntity(poolId.toHexString(), tokenAddress);
      let poolToken = loadPoolToken(poolId.toHexString(), tokenAddress);

      poolToken.save();
    }

    pool.tokensList = tokensList;
  }
  pool.save();

  CCPoolTemplate.create(poolAddress);
}

function findOrInitializeVault(): Balancer {
  let vault: Balancer | null = Balancer.load('2');
  if (vault !== null) return vault as Balancer;

  // if no vault yet, set up blank initial
  vault = new Balancer('2');
  vault.poolCount = 0;
  vault.totalLiquidity = ZERO_BD;
  vault.totalSwapVolume = ZERO_BD;
  vault.totalSwapFee = ZERO_BD;
  return vault as Balancer;
}

function handleNewPool(event: PoolCreated, poolId: Bytes, swapFee: BigInt): Pool | null {
  let poolAddress: Address = event.params.pool;

  let pool = Pool.load(poolId.toHexString());
  if (pool == null) {
    pool = newPoolEntity(poolId.toHexString());

    pool.swapFee = scaleDown(swapFee, 18);
    pool.createTime = event.block.timestamp.toI32();
    pool.address = poolAddress;
    pool.tx = event.transaction.hash;
    pool.swapEnabled = true;

    let bpt = ERC20.bind(poolAddress);

    let nameCall = bpt.try_name();
    if (!nameCall.reverted) {
      pool.name = nameCall.value;
    }

    let symbolCall = bpt.try_symbol();
    if (!symbolCall.reverted) {
      pool.symbol = symbolCall.value;
    }

    let vault = findOrInitializeVault();
    vault.poolCount += 1;
    vault.save();
  }

  pool.save();
  return pool;
}
