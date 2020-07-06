import { Address, BigInt, Bytes, dataSource, ethereum } from '@graphprotocol/graph-ts/index';
import { BigDecimal } from '@graphprotocol/graph-ts'
import { BTokenBytes } from '../types/templates/Pool/BTokenBytes'
import { BToken } from '../types/templates/Pool/BToken'
import {
  Pool,
  User,
  PoolToken,
  PoolShare,
  TokenPrice,
  Transaction
} from '../types/schema'

export let ZERO_BD = BigDecimal.fromString('0')

let network = dataSource.network()

export let WETH: string = (network == 'mainnet')
  ? '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
  : '0xd0a1e359811322d97991e03f863a0c30c2cf029c'

export let USD: string = (network == 'mainnet')
  ? '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' // USDC
  : '0x1528f3fcc26d13f7079325fb78d9442607781c8c' // DAI

export function hexToDecimal(hexString: String, decimals: i32): BigDecimal {
  let bytes = Bytes.fromHexString(hexString).reverse() as Bytes
  let bi = BigInt.fromUnsignedBytes(bytes)
  let scale = BigInt.fromI32(10).pow(decimals as u8).toBigDecimal()
  return bi.divDecimal(scale)
}

export function bigIntToDecimal(amount: BigInt, decimals: i32): BigDecimal {
  let scale = BigInt.fromI32(10).pow(decimals as u8).toBigDecimal()
  return amount.toBigDecimal().div(scale)
}

export function tokenToDecimal(amount: BigDecimal, decimals: i32): BigDecimal {
  let scale = BigInt.fromI32(10).pow(decimals as u8).toBigDecimal()
  return amount.div(scale)
}

export function createPoolShareEntity(id: string, pool: String, user: String): void {
  let poolShare = new PoolShare(id)

  let userdb = User.load(user)
  if (userdb == null) {
    userdb = new User(user)
    userdb.save()
  }
  poolShare.userAddress = user
  poolShare.poolId = pool
  poolShare.balance = ZERO_BD
  poolShare.save()
}

export function createPoolTokenEntity(id: string, pool: String, address: String): void {
  let token = BToken.bind(Address.fromString(address))
  let tokenBytes = BTokenBytes.bind(Address.fromString(address))
  let symbol = ''
  let name = ''
  let decimals = 18

  // COMMENT THE LINES BELOW OUT FOR LOCAL DEV ON KOVAN

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

  // COMMENT THE LINES ABOVE OUT FOR LOCAL DEV ON KOVAN

  // !!! COMMENT THE LINES BELOW OUT FOR NON-LOCAL DEPLOYMENT
  // This code allows Symbols to be added when testing on local Kovan
  /*
  if(address == '0xd0a1e359811322d97991e03f863a0c30c2cf029c')
    symbol = 'WETH';
  else if(address == '0x1528f3fcc26d13f7079325fb78d9442607781c8c')
    symbol = 'DAI'
  else if(address == '0xef13c0c8abcaf5767160018d268f9697ae4f5375')
    symbol = 'MKR'
  else if(address == '0x2f375e94fc336cdec2dc0ccb5277fe59cbf1cae5')
    symbol = 'USDC'
  else if(address == '0x1f1f156e0317167c11aa412e3d1435ea29dc3cce')
    symbol = 'BAT'
  else if(address == '0x86436bce20258a6dcfe48c9512d4d49a30c4d8c4')
    symbol = 'SNX'
  else if(address == '0x8c9e6c40d3402480ace624730524facc5482798c')
    symbol = 'REP'
  */
  // !!! COMMENT THE LINES ABOVE OUT FOR NON-LOCAL DEPLOYMENT

  let poolToken = new PoolToken(id)
  poolToken.poolId = pool
  poolToken.address = address
  poolToken.name = name
  poolToken.symbol = symbol
  poolToken.decimals = decimals
  poolToken.balance = ZERO_BD
  poolToken.denormWeight = ZERO_BD
  poolToken.save()
}

export function updatePoolLiquidity(id: string): void {
  let pool = Pool.load(id)
  let tokensList: Array<Bytes> = pool.tokensList

  if (!tokensList || !pool.publicSwap) return

  // Find pool liquidity

  let hasPrice = false
  let poolLiquidity = ZERO_BD

  if (tokensList.includes(Address.fromString(USD))) {
    let usdPoolTokenId = id.concat('-').concat(USD)
    let usdPoolToken = PoolToken.load(usdPoolTokenId)
    poolLiquidity = usdPoolToken.balance.div(usdPoolToken.denormWeight).times(pool.totalWeight)
    hasPrice = true
  } else if (tokensList.includes(Address.fromString(WETH))) {
    let wethTokenPrice = TokenPrice.load(WETH)
    if (wethTokenPrice !== null) {
      let poolTokenId = id.concat('-').concat(WETH)
      let poolToken = PoolToken.load(poolTokenId)
      poolLiquidity = wethTokenPrice.price.times(poolToken.balance).div(poolToken.denormWeight).times(pool.totalWeight)
      hasPrice = true
    }
  }

  // Create or update token price

  if (hasPrice) {
    for (let i: i32 = 0; i < tokensList.length; i++) {
      let tokenPriceId = tokensList[i].toHexString()
      let tokenPrice = TokenPrice.load(tokenPriceId)
      if (tokenPrice == null) {
        tokenPrice = new TokenPrice(tokenPriceId)
        tokenPrice.poolTokenId = ''
        tokenPrice.poolLiquidity = ZERO_BD
      }

      let poolTokenId = id.concat('-').concat(tokenPriceId)
      let poolToken = PoolToken.load(poolTokenId)

      if (tokenPrice.poolTokenId == poolTokenId || poolLiquidity.gt(tokenPrice.poolLiquidity)) {
        tokenPrice.price = ZERO_BD

        if (poolToken.balance.gt(ZERO_BD)) {
          tokenPrice.price = poolLiquidity.div(pool.totalWeight).times(poolToken.denormWeight).div(poolToken.balance)
        }

        tokenPrice.symbol = poolToken.symbol
        tokenPrice.poolLiquidity = poolLiquidity
        tokenPrice.poolTokenId = poolTokenId
        tokenPrice.save()
      }
    }
  }

  // Update pool liquidity

  let liquidity = ZERO_BD
  let denormWeight = ZERO_BD

  for (let i: i32 = 0; i < tokensList.length; i++) {
    let tokenPriceId = tokensList[i].toHexString()
    let tokenPrice = TokenPrice.load(tokenPriceId)
    if (tokenPrice !== null) {
      let poolTokenId = id.concat('-').concat(tokenPriceId)
      let poolToken = PoolToken.load(poolTokenId)
      if (poolToken.denormWeight.gt(denormWeight)) {
        denormWeight = poolToken.denormWeight
        liquidity = tokenPrice.price.times(poolToken.balance).div(poolToken.denormWeight).times(pool.totalWeight)
      }
    }
  }

  pool.liquidity = liquidity
  pool.save()
}

export function saveTransaction(event: ethereum.Event, eventName: string): void {
  let tx = event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString())

  let transaction = Transaction.load(tx)
  if (transaction == null) {
    transaction = new Transaction(tx)
  }
  transaction.event = eventName
  transaction.poolAddress = event.address.toHex()
  transaction.userAddress = event.transaction.from.toHex()
  transaction.gasUsed = event.transaction.gasUsed.toBigDecimal()
  transaction.gasPrice = event.transaction.gasPrice.toBigDecimal()
  transaction.tx = event.transaction.hash
  transaction.timestamp = event.block.timestamp.toI32()
  transaction.block = event.block.number.toI32()
  transaction.save()
}
