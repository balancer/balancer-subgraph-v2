import { BigInt, BigDecimal, Address, ByteArray, log } from '@graphprotocol/graph-ts'
import { LOG_CALL } from '../types/templates/Pool/Pool'
import {
  Balancer,
  Pool,
  Transaction
} from '../types/schema'

/************************************
 ********** Helpers ***********
 ************************************/

function exponentToBigDecimal(decimals: i32): BigDecimal {
  let bd = BigDecimal.fromString('1')
  for (let i = 0; i < decimals; i++) {
    bd = bd.times(BigDecimal.fromString('10'))
  }
  return bd
}


/************************************
 ********** Pool Controls ***********
 ************************************/

export function handleSetFees(event: LOG_CALL): void {
  const swapFee = event.params.data.toHexString().slice(10,74)
  const exitFee = event.params.data.toHexString().slice(74)
  log.info('swapFee: {}, exitFee: {}', [swapFee, exitFee])
}

export function handleSetController(event: LOG_CALL): void {
  let controller = event.params.data.toHexString().slice(-40)
  log.info('controller: {}', [controller])
}

export function handleSetPublicSwap(event: LOG_CALL): void {
  let publicSwap = event.params.data.toHexString().slice(-1)
  log.info('publicSwap: {}', [publicSwap])
}

export function handleSetPublicJoin(event: LOG_CALL): void {
  let publicJoin = event.params.data.toHexString().slice(-1)
  log.info('publicJoin: {}', [publicJoin])
}

export function handleSetPublicExit(event: LOG_CALL): void {
  let publicExit = event.params.data.toHexString().slice(-1)
  log.info('publicExit: {}', [publicExit])
}

export function handleFinalize(event: LOG_CALL): void {
  const poolId = event.address.toHex()
  const pool = Pool.load(poolId)
  pool.finalized = true
  pool.publicSwap = true
  pool.publicJoin = true
  pool.publicExit = true
  log.info('finalize: {}', [event.params.data.toHexString().slice(-24)])
  pool.save()
}

export function handleRebind(event: LOG_CALL): void {
  let address = event.params.data.toHexString().slice(10,74)
  let balance = event.params.data.toHexString().slice(74,138)
  let denorm = event.params.data.toHexString().slice(138)
  log.info('address: {}, balance: {}, denorm: {}', [address, balance, denorm])
}

export function handleUnbind(event: LOG_CALL): void {
  let address = event.params.data.toHexString().slice(-40)
  log.info('unbind: {}', [address])
}

/************************************
 ********** JOINS & EXITS ***********
 ************************************/

export function handleJoinPool(event: LOG_CALL): void {

}
