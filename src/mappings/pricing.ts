import { Address, BigInt, log } from '@graphprotocol/graph-ts';
import { Token, FXOracle } from '../types/schema';
import { scaleDown } from './helpers/misc';
import { FX_ASSET_AGGREGATORS } from './helpers/constants';
import { AnswerUpdated } from '../types/templates/OffchainAggregator/AccessControlledOffchainAggregator';

export function handleAnswerUpdated(event: AnswerUpdated): void {
  const aggregatorAddress = event.address;
  const answer = event.params.current;
  const tokenAddressesToUpdate: Address[] = [];

  // Check if the aggregator is under FX_ASSET_AGGREGATORS first (FXPoolFactory version)
  for (let i = 0; i < FX_ASSET_AGGREGATORS.length; i++) {
    if (aggregatorAddress == FX_ASSET_AGGREGATORS[i][1]) {
      tokenAddressesToUpdate.push(FX_ASSET_AGGREGATORS[i][0]);
    }
  }

  // Also check if aggregator exists from FXOracle entity (FXPoolDeployer version)
  let oracle = FXOracle.load(aggregatorAddress.toHexString());
  if (oracle) {
    for (let i = 0; i < oracle.tokens.length; i++) {
      const tokenAddress = Address.fromBytes(oracle.tokens[i]);
      const tokenExists = tokenAddressesToUpdate.includes(tokenAddress);
      if (!tokenExists) {
        tokenAddressesToUpdate.push(tokenAddress);
      }
    }
  } else {
    log.warning('Oracle not found: {}', [aggregatorAddress.toHexString()]);
  }

  // Update all tokens using this aggregator
  for (let i = 0; i < tokenAddressesToUpdate.length; i++) {
    const tokenAddress = tokenAddressesToUpdate[i];

    const token = Token.load(tokenAddress.toHexString());
    if (token == null) {
      log.warning('Token with address {} not found', [tokenAddress.toHexString()]);
      continue;
    }

    // All tokens we track have oracles with 8 decimals
    if (!token.fxOracleDecimals) {
      token.fxOracleDecimals = 8; // @todo: get decimals on-chain
    }

    if (tokenAddress == Address.fromString('0xc8bb8eda94931ca2f20ef43ea7dbd58e68400400')) {
      // XAU-USD oracle returns an answer with price unit of "USD per troy ounce"
      // For VNXAU however, we wanna use a price unit of "USD per gram"
      const divisor = '3110347680'; // 31.1034768 * 1e8 (31.10 gram per troy ounce)
      const multiplier = '100000000'; // 1 * 1e8
      const pricePerGram = answer.times(BigInt.fromString(multiplier)).div(BigInt.fromString(divisor));
      token.latestFXPrice = scaleDown(pricePerGram, 8);
    } else if (oracle && oracle.divisor !== null && oracle.decimals) {
      const updatedAnswer = answer
        .times(BigInt.fromString('10').pow(oracle.decimals as u8))
        .div(BigInt.fromString(oracle.divisor as string));
      token.latestFXPrice = scaleDown(updatedAnswer, 8);
    } else {
      token.latestFXPrice = scaleDown(answer, 8);
    }

    token.save();
  }
}
