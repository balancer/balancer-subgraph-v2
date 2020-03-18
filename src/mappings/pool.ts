import { BigInt, BigDecimal, Address, Bytes, ByteArray, log, store } from '@graphprotocol/graph-ts'
import { LOG_CALL, LOG_JOIN, LOG_EXIT, LOG_SWAP } from '../types/templates/Pool/Pool'
import { BToken } from '../types/templates/Pool/BToken'
import { BTokenBytes } from '../types/templates/Pool/BTokenBytes'

import {
  Balancer,
  Pool,
  User,
  PoolToken,
  PoolShare,
  Transaction,
  Swap
} from '../types/schema'

/************************************
 ********** Helpers ***********
 ************************************/

function hexToDecimal(hexString: String, decimals: i32): BigDecimal {
  let bytes = Bytes.fromHexString(hexString).reverse() as Bytes
  let bi = BigInt.fromUnsignedBytes(bytes)
  let scale = BigInt.fromI32(10).pow(decimals as u8).toBigDecimal()
  return bi.divDecimal(scale)
}

function tokenToDecimal(amount: BigDecimal, decimals: i32): BigDecimal {
  let scale = BigInt.fromI32(10).pow(decimals as u8).toBigDecimal()
  return amount.div(scale)
}

function createPoolShareEntity(id: string, pool: String, user: String): void {
  let poolShare = new PoolShare(id)
  poolShare.userAddress = user
  poolShare.poolId = pool
  poolShare.balance = BigDecimal.fromString('0')
  poolShare.save()
}

function createPoolTokenEntity(id: string, pool: String, address: String): void {
  let token = BToken.bind(Address.fromString(address))
  let tokenBytes = BTokenBytes.bind(Address.fromString(address))
  let symbol = ''
  let name = ''
  let decimals = 18
  let symbolCall = token.try_symbol()
  let nameCall = token.try_name()
  let decimalCall = token.try_decimals()

  if (symbolCall.reverted) {
    let symbolBytesCall = tokenBytes.try_symbol()
    if (!symbolBytesCall.reverted) {
      symbol = symbolBytesCall.value.toString()
    }
  } else {
    symbol = symbolCall.value
  }

  if (nameCall.reverted) {
    let nameBytesCall = tokenBytes.try_name()
    if (!nameBytesCall.reverted) {
      name = nameBytesCall.value.toString()
    }
  } else {
    name = nameCall.value
  }

  if (!decimalCall.reverted) {
    decimals = decimalCall.value
  }

  let poolToken = new PoolToken(id)
  poolToken.poolId = pool
  poolToken.address = address
  poolToken.name = name
  poolToken.symbol = symbol
  poolToken.decimals = decimals
  poolToken.balance = BigDecimal.fromString('0')
  poolToken.denormWeight = BigDecimal.fromString('0')
  poolToken.save()
}


/************************************
 ********** Pool Controls ***********
 ************************************/

export function handleSetSwapFee(event: LOG_CALL): void {
  let poolId = event.address.toHex()
  let pool = Pool.load(poolId)
  let swapFee = hexToDecimal(event.params.data.toHexString().slice(-40), 18)
  pool.swapFee = swapFee
  pool.save()

  let tx = event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString())
  let transaction = Transaction.load(tx)
  if (transaction == null) {
    transaction = new Transaction(tx)
  }
  transaction.event = 'setSwapFee'
  transaction.poolAddress = event.address.toHex()
  transaction.userAddress = event.transaction.from.toHex()
  transaction.gasUsed = event.transaction.gasUsed.toBigDecimal()
  transaction.gasPrice = event.transaction.gasPrice.toBigDecimal()
  transaction.tx = event.transaction.hash
  transaction.timestamp = event.block.timestamp.toI32()
  transaction.block = event.block.number.toI32()
  transaction.save()
}

export function handleSetController(event: LOG_CALL): void {
  let poolId = event.address.toHex()
  let pool = Pool.load(poolId)
  let controller = Address.fromString(event.params.data.toHexString().slice(-40))
  pool.controller = controller
  pool.save()

  let tx = event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString())
  let transaction = Transaction.load(tx)
  if (transaction == null) {
    transaction = new Transaction(tx)
  }
  transaction.event = 'setController'
  transaction.poolAddress = event.address.toHex()
  transaction.userAddress = event.transaction.from.toHex()
  transaction.gasUsed = event.transaction.gasUsed.toBigDecimal()
  transaction.gasPrice = event.transaction.gasPrice.toBigDecimal()
  transaction.tx = event.transaction.hash
  transaction.timestamp = event.block.timestamp.toI32()
  transaction.block = event.block.number.toI32()
  transaction.save()
}

export function handleSetPublicSwap(event: LOG_CALL): void {
  let poolId = event.address.toHex()
  let pool = Pool.load(poolId)
  let publicSwap = event.params.data.toHexString().slice(-1) == '1'
  pool.publicSwap = publicSwap
  pool.save()

  let tx = event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString())
  let transaction = Transaction.load(tx)
  if (transaction == null) {
    transaction = new Transaction(tx)
  }
  transaction.event = 'setPublicSwap'
  transaction.poolAddress = event.address.toHex()
  transaction.userAddress = event.transaction.from.toHex()
  transaction.gasUsed = event.transaction.gasUsed.toBigDecimal()
  transaction.gasPrice = event.transaction.gasPrice.toBigDecimal()
  transaction.tx = event.transaction.hash
  transaction.timestamp = event.block.timestamp.toI32()
  transaction.block = event.block.number.toI32()
  transaction.save()
}

export function handleFinalize(event: LOG_CALL): void {
  let poolId = event.address.toHex()
  let pool = Pool.load(poolId)
  let balance = BigDecimal.fromString('100')
  pool.finalized = true
  pool.publicSwap = true
  pool.totalShares = balance
  pool.save()
  
  let userId = event.params.caller.toHex()
  let user = User.load(userId)
  if (user == null) {
    user = new User(userId)
    user.save()
  }

  let poolShareId = poolId.concat('-').concat(event.params.caller.toHex())
  let poolShare = PoolShare.load(poolShareId)
  if (poolShare == null) {
    createPoolShareEntity(poolShareId, poolId, event.params.caller.toHex())
    poolShare = PoolShare.load(poolShareId)
  }
  poolShare.balance = balance
  poolShare.save()

  let tx = event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString())
  let transaction = Transaction.load(tx)
  if (transaction == null) {
    transaction = new Transaction(tx)
  }
  transaction.event = 'finalize'
  transaction.poolAddress = event.address.toHex()
  transaction.userAddress = event.transaction.from.toHex()
  transaction.gasUsed = event.transaction.gasUsed.toBigDecimal()
  transaction.gasPrice = event.transaction.gasPrice.toBigDecimal()
  transaction.tx = event.transaction.hash
  transaction.timestamp = event.block.timestamp.toI32()
  transaction.block = event.block.number.toI32()
  transaction.save()
}

export function handleRebind(event: LOG_CALL): void {
  let poolId = event.address.toHex()
  let pool = Pool.load(poolId)
  let tokenBytes = Bytes.fromHexString(event.params.data.toHexString().slice(34,74)) as Bytes
  let tokensList = pool.tokensList || []
  if (tokensList.indexOf(tokenBytes) == -1 ) {
    tokensList.push(tokenBytes)
  }
  pool.tokensList = tokensList
  

  let address = Address.fromString(event.params.data.toHexString().slice(34,74))
  let denormWeight = hexToDecimal(event.params.data.toHexString().slice(138), 18)

  let poolTokenId = poolId.concat('-').concat(address.toHexString())
  let poolToken = PoolToken.load(poolTokenId)
  if (poolToken == null) {
    createPoolTokenEntity(poolTokenId, poolId, address.toHexString())
    poolToken = PoolToken.load(poolTokenId)
    pool.totalWeight += denormWeight
  } else {
    let oldWeight = poolToken.denormWeight
    if (denormWeight > oldWeight) {
      pool.totalWeight = pool.totalWeight + (denormWeight - oldWeight);
    } else {
      pool.totalWeight = pool.totalWeight - (oldWeight - denormWeight);
    }   
  }

  let balance = hexToDecimal(event.params.data.toHexString().slice(74,138), poolToken.decimals)

  poolToken.balance = balance
  poolToken.denormWeight = denormWeight
  poolToken.save()
  pool.save()

  let tx = event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString())
  let transaction = Transaction.load(tx)
  if (transaction == null) {
    transaction = new Transaction(tx)
  }
  transaction.event = 'rebind'
  transaction.poolAddress = event.address.toHex()
  transaction.userAddress = event.transaction.from.toHex()
  transaction.gasUsed = event.transaction.gasUsed.toBigDecimal()
  transaction.gasPrice = event.transaction.gasPrice.toBigDecimal()
  transaction.tx = event.transaction.hash
  transaction.timestamp = event.block.timestamp.toI32()
  transaction.block = event.block.number.toI32()
  transaction.save()
}

export function handleUnbind(event: LOG_CALL): void {
  let poolId = event.address.toHex()
  let pool = Pool.load(poolId)
  let tokenBytes = Bytes.fromHexString(event.params.data.toHexString().slice(-40)) as Bytes
  let tokensList = pool.tokensList || []
  let index = tokensList.indexOf(tokenBytes)
  tokensList.slice(index, 1)
  pool.tokensList = tokensList


  let address = Address.fromString(event.params.data.toHexString().slice(-40))
  let poolTokenId = poolId.concat('-').concat(address.toString())
  let poolToken = PoolToken.load(poolTokenId)
  pool.totalWeight -= poolToken.denormWeight
  pool.save()
  store.remove('PoolToken', poolTokenId)

  let tx = event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString())
  let transaction = Transaction.load(tx)
  if (transaction == null) {
    transaction = new Transaction(tx)
  }
  transaction.event = 'unbind'
  transaction.poolAddress = event.address.toHex()
  transaction.userAddress = event.transaction.from.toHex()
  transaction.gasUsed = event.transaction.gasUsed.toBigDecimal()
  transaction.gasPrice = event.transaction.gasPrice.toBigDecimal()
  transaction.tx = event.transaction.hash
  transaction.timestamp = event.block.timestamp.toI32()
  transaction.block = event.block.number.toI32()
  transaction.save()
}

/************************************
 ********** JOINS & EXITS ***********
 ************************************/

export function handleJoinPool(event: LOG_JOIN): void {
  let poolId = event.address.toHex()
  let pool = Pool.load(poolId)
  pool.joinsCount += BigInt.fromI32(1)
  pool.save()

  let address = event.params.tokenIn.toHex()
  let poolTokenId = poolId.concat('-').concat(address.toString())
  let poolToken = PoolToken.load(poolTokenId)
  let tokenAmountIn = tokenToDecimal(event.params.tokenAmountIn.toBigDecimal(), poolToken.decimals)
  let newAmount = poolToken.balance.plus(tokenAmountIn)
  poolToken.balance = newAmount 
  poolToken.save()

  let tx = event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString())
  let transaction = Transaction.load(tx)
  if (transaction == null) {
    transaction = new Transaction(tx)
  }
  transaction.event = 'join'
  transaction.poolAddress = event.address.toHex()
  transaction.userAddress = event.transaction.from.toHex()
  transaction.gasUsed = event.transaction.gasUsed.toBigDecimal()
  transaction.gasPrice = event.transaction.gasPrice.toBigDecimal()
  transaction.tx = event.transaction.hash
  transaction.timestamp = event.block.timestamp.toI32()
  transaction.block = event.block.number.toI32()
  transaction.save()
}

export function handleExitPool(event: LOG_EXIT): void {
  let poolId = event.address.toHex()
  let pool = Pool.load(poolId)
  pool.exitsCount += BigInt.fromI32(1)
  pool.save()

  let address = event.params.tokenOut.toHex()
  let poolTokenId = poolId.concat('-').concat(address.toString())
  let poolToken = PoolToken.load(poolTokenId)
  let tokenAmountOut = tokenToDecimal(event.params.tokenAmountOut.toBigDecimal(), poolToken.decimals)
  let newAmount = poolToken.balance.minus(tokenAmountOut)
  poolToken.balance = newAmount 
  poolToken.save()

  let tx = event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString())
  let transaction = Transaction.load(tx)
  if (transaction == null) {
    transaction = new Transaction(tx)
  }
  transaction.event = 'exit'
  transaction.poolAddress = event.address.toHex()
  transaction.userAddress = event.transaction.from.toHex()
  transaction.gasUsed = event.transaction.gasUsed.toBigDecimal()
  transaction.gasPrice = event.transaction.gasPrice.toBigDecimal()
  transaction.tx = event.transaction.hash
  transaction.timestamp = event.block.timestamp.toI32()
  transaction.block = event.block.number.toI32()
  transaction.save()
}

/************************************
 ************** SWAPS ***************
 ************************************/

export function handleSwap(event: LOG_SWAP): void {
  let poolId = event.address.toHex()
  let pool = Pool.load(poolId)
  pool.swapsCount += BigInt.fromI32(1)
  pool.save()

  let tokenIn = event.params.tokenIn.toHex()
  let poolTokenInId = poolId.concat('-').concat(tokenIn.toString())
  let poolTokenIn = PoolToken.load(poolTokenInId)
  let tokenAmountIn = tokenToDecimal(event.params.tokenAmountIn.toBigDecimal(), poolTokenIn.decimals)
  let newAmountIn = poolTokenIn.balance.plus(tokenAmountIn)
  poolTokenIn.balance = newAmountIn
  poolTokenIn.save()

  let tokenOut = event.params.tokenOut.toHex()
  let poolTokenOutId = poolId.concat('-').concat(tokenOut.toString())
  let poolTokenOut = PoolToken.load(poolTokenOutId)
  let tokenAmountOut = tokenToDecimal(event.params.tokenAmountOut.toBigDecimal(), poolTokenOut.decimals)
  let newAmountOut = poolTokenOut.balance.minus(tokenAmountOut)
  poolTokenOut.balance = newAmountOut
  poolTokenOut.save()

  let swapId = event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString())
  let swap = Swap.load(swapId)
  if (swap == null) {
    swap = new Swap(swapId)
  }
  swap.caller = event.params.caller
  swap.tokenIn = event.params.tokenIn
  swap.tokenOut = event.params.tokenOut
  swap.tokenAmountIn = tokenAmountIn
  swap.tokenAmountOut = tokenAmountOut
  swap.save()

  let tx = event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString())
  let transaction = Transaction.load(tx)
  if (transaction == null) {
    transaction = new Transaction(tx)
  }
  transaction.event = 'swap'
  transaction.poolAddress = event.address.toHex()
  transaction.userAddress = event.transaction.from.toHex()
  transaction.gasUsed = event.transaction.gasUsed.toBigDecimal()
  transaction.gasPrice = event.transaction.gasPrice.toBigDecimal()
  transaction.tx = event.transaction.hash
  transaction.timestamp = event.block.timestamp.toI32()
  transaction.block = event.block.number.toI32()
  transaction.save()
}
