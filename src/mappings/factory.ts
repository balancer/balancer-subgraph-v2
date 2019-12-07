import { BigInt, BigDecimal, Address } from '@graphprotocol/graph-ts'
import { LOG_NEW_POOL } from '../types/Factory/Factory'
import { Balancer, Pool } from '../types/schema'
import { Pool as PoolContract } from '../types/templates'

export function handleNewPool(event: LOG_NEW_POOL): void {
  let factory = Balancer.load('1')

  // if no factory yet, set up blank initial
  if (factory == null) {
    factory = new Balancer('1')
    factory.color = 'Bronze'
    factory.poolCount = 0
    factory.txCount = BigInt.fromI32(0)
  }
  factory.poolCount = factory.poolCount + 1
  factory.save()

  let pool = new Pool(event.params.pool.toHexString())
  pool.controller = event.params.caller
  pool.publicSwap = false
  pool.finalized = false
  pool.swapFee = BigDecimal.fromString('0')
  pool.exitFee = BigDecimal.fromString('0.000001')
  pool.totalWeight = BigDecimal.fromString('0')
  pool.totalShares = BigDecimal.fromString('0')
  pool.createTime = event.block.timestamp.toI32()
  pool.joinsCount = BigInt.fromI32(0)
  pool.exitsCount = BigInt.fromI32(0)
  pool.swapsCount = BigInt.fromI32(0)
  pool.factoryID = event.address.toHexString()

  pool.save()

  PoolContract.create(event.params.pool)
}
