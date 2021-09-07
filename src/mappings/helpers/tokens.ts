import { Address, BigDecimal, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { Token, TokenSnapshot } from '../../types/schema';
import { ERC20 } from '../../types/Vault/ERC20';
import { Swap as SwapEvent } from '../../types/Vault/Vault';
import { ZERO, ZERO_BD } from './constants';

export function createToken(tokenAddress: Address): Token {
  let erc20token = ERC20.bind(tokenAddress);
  let token = new Token(tokenAddress.toHexString());
  let name = '';
  let symbol = '';
  let decimals = 0;

  // attempt to retrieve erc20 values
  let maybeName = erc20token.try_name();
  let maybeSymbol = erc20token.try_symbol();
  let maybeDecimals = erc20token.try_decimals();

  if (!maybeName.reverted) name = maybeName.value;
  if (!maybeSymbol.reverted) symbol = maybeSymbol.value;
  if (!maybeDecimals.reverted) decimals = maybeDecimals.value;

  token.name = name;
  token.symbol = symbol;
  token.decimals = decimals;
  token.totalBalanceUSD = ZERO_BD;
  token.totalBalanceNotional = ZERO_BD;
  token.totalSwapCount = ZERO;
  token.totalVolumeUSD = ZERO_BD;
  token.totalVolumeNotional = ZERO_BD;
  token.poolCount = ZERO;
  token.address = tokenAddress.toHexString();
  token.save();
  return token;
}

// this will create the token entity and populate
// with erc20 values
export function getToken(tokenAddress: Address): Token {
  let token = Token.load(tokenAddress.toHexString());
  if (token == null) {
    token = createToken(tokenAddress);
  }
  return token!;
}

export function getTokenSnapshot(tokenAddress: Address, event: ethereum.Event): TokenSnapshot {
  let timestamp = event.block.timestamp.toI32();
  let dayID = timestamp / 86400;
  let id = tokenAddress.toHexString() + '-' + dayID.toString();
  let dayData = TokenSnapshot.load(id);

  if (dayData == null) {
    let dayStartTimestamp = dayID * 86400;
    let token = getToken(tokenAddress);
    dayData = new TokenSnapshot(id);
    dayData.timestamp = BigInt.fromI32(dayStartTimestamp);
    dayData.totalSwapCount = ZERO;
    dayData.totalBalanceUSD = ZERO_BD;
    dayData.totalBalanceNotional = ZERO_BD;
    dayData.totalVolumeUSD = ZERO_BD;
    dayData.totalVolumeNotional = ZERO_BD;
    dayData.poolCount = ZERO;
    dayData.token = token.id;
    dayData.save();
  }

  return dayData as TokenSnapshot;
}

export function uptickSwapsForToken(tokenAddress: Address, event: ethereum.Event): void {
  let token = getToken(tokenAddress);
  // update the overall swap count for the token
  token.totalSwapCount = token.totalSwapCount.plus(BigInt.fromI32(1));
  token.save();

  // update the snapshots
  let snapshot = getTokenSnapshot(tokenAddress, event);
  snapshot.totalSwapCount = token.totalSwapCount.plus(BigInt.fromI32(1));
  snapshot.save();
}

export const SWAP_IN = 0;
export const SWAP_OUT = 1;

export function updateTokenBalances(tokenAddress: Address, usdBalance: BigDecimal, notionalBalance: BigDecimal, swapDirection: i32, event: SwapEvent): void {
  let token = getToken(tokenAddress);
  let tokenSnapshot = getTokenSnapshot(tokenAddress, event);

  if (swapDirection == SWAP_IN) {
    token.totalBalanceNotional = token.totalBalanceNotional.plus(notionalBalance);
    tokenSnapshot.totalBalanceNotional = tokenSnapshot.totalBalanceNotional.plus(notionalBalance);

    token.totalBalanceUSD = token.totalBalanceUSD.plus(usdBalance);
    tokenSnapshot.totalBalanceUSD = tokenSnapshot.totalBalanceUSD.plus(usdBalance);
  } else if (swapDirection == SWAP_OUT) {
    token.totalBalanceNotional = token.totalBalanceNotional.minus(notionalBalance);
    tokenSnapshot.totalBalanceNotional = tokenSnapshot.totalBalanceNotional.minus(notionalBalance);

    token.totalBalanceUSD = token.totalBalanceUSD.minus(usdBalance);
    tokenSnapshot.totalBalanceUSD = tokenSnapshot.totalBalanceUSD.minus(usdBalance);
  }

  token.totalVolumeUSD = token.totalVolumeUSD.plus(usdBalance);
  tokenSnapshot.totalVolumeUSD = token.totalVolumeUSD.plus(usdBalance);

  token.totalVolumeNotional = token.totalVolumeNotional.plus(notionalBalance);
  tokenSnapshot.totalVolumeNotional = token.totalVolumeNotional.plus(notionalBalance);

  token.save();
  tokenSnapshot.save();
}