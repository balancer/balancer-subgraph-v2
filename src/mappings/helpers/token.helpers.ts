import { Address } from '@graphprotocol/graph-ts';
import { Token } from '../../types/schema';
import { ERC20 } from '../../types/Vault/ERC20';
import { ZERO_BD, ZERO_BI } from '../constants';

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
  token.totalBalance = ZERO_BD;
  token.totalTxCount = ZERO_BI;
  token.totalVolume = ZERO_BD;
  token.poolCount = ZERO_BI;
  token.save();
  return token;
}

export function getToken(tokenAddress: Address): Token {
  let token = Token.load(tokenAddress.toHexString());
  if (!token) {
    token = createToken(tokenAddress);
  }
  return token!;
}
