import { BigInt, BigDecimal } from '@graphprotocol/graph-ts';
import { PoolCreated } from '../types/Vault/Vault';
import { Balancer, Pool } from '../types/schema';
//import { PoolController } from '../types/templates';
import { ZERO_BD } from './helpers';
import { LOG_JOIN } from '../types/templates/Pool/Pool';
import { PoolToken } from '../types/schema';

import { tokenToDecimal, updatePoolLiquidity, saveTransaction } from './helpers';

export function handleNewPool(event: PoolCreated): void {
  let vault = Balancer.load('2');

  // if no vault yet, set up blank initial
  if (vault == null) {
    vault = new Balancer('2');
    vault.color = 'Silver';
    vault.poolCount = 0;
    vault.finalizedPoolCount = 0;
    vault.txCount = BigInt.fromI32(0);
    vault.totalLiquidity = ZERO_BD;
    vault.totalSwapVolume = ZERO_BD;
    vault.totalSwapFee = ZERO_BD;
  }

  const pool = new Pool(event.params.poolId.toHexString());
  //pool.crp = isCrp(event.params.caller)
  //pool.rights = []
  //if (pool.crp) {
  //vault.crpCount += 1
  //let crp = ConfigurableRightsPool.bind(event.params.caller)
  //pool.symbol = getCrpSymbol(crp)
  //pool.name = getCrpName(crp)
  //pool.crpController = Address.fromString(getCrpController(crp))
  //pool.rights = getCrpRights(crp)
  //pool.cap = getCrpCap(crp)
  //}
  //pool.controller = event.params.caller
  //pool.publicSwap = false
  //pool.finalized = false
  pool.active = true;
  // TODO
  pool.swapFee = BigDecimal.fromString('0.000001');
  pool.totalWeight = ZERO_BD;
  pool.totalShares = ZERO_BD;
  pool.totalSwapVolume = ZERO_BD;
  pool.totalSwapFee = ZERO_BD;
  pool.liquidity = ZERO_BD;
  pool.createTime = event.block.timestamp.toI32();
  pool.tokensCount = BigInt.fromI32(0);
  pool.holdersCount = BigInt.fromI32(0);
  pool.joinsCount = BigInt.fromI32(0);
  pool.exitsCount = BigInt.fromI32(0);
  pool.swapsCount = BigInt.fromI32(0);
  pool.vaultID = '2';
  pool.tokensList = [];
  pool.tx = event.transaction.hash;
  pool.save();

  vault.poolCount = vault.poolCount + 1;
  vault.save();

  //PoolController.create(event.params.poolId)
}

export function handleAddLiquidity(event: LOG_JOIN): void {
  const poolId = event.address.toHex();
  const pool = Pool.load(poolId);
  pool.joinsCount = pool.joinsCount + BigInt.fromI32(1);
  pool.save();

  const address = event.params.tokenIn.toHex();
  const poolTokenId = poolId.concat('-').concat(address.toString());
  const poolToken = PoolToken.load(poolTokenId);
  const tokenAmountIn = tokenToDecimal(event.params.tokenAmountIn.toBigDecimal(), poolToken.decimals);
  const newAmount = poolToken.balance.plus(tokenAmountIn);
  poolToken.balance = newAmount;
  poolToken.save();

  updatePoolLiquidity(poolId);
  saveTransaction(event, 'join');
}
