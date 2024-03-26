import { BigInt, Bytes, log } from '@graphprotocol/graph-ts';
import { Chest } from '../types/schema';
import { IncreaseStake, Staked, Unstake } from '../types/templates/Chest/Chest';

export function handleIncreaseStake(event: IncreaseStake): void {
  let chest = Chest.load(event.params.tokenId.toHexString());

  if (chest == null) {
    log.error('Chest does not exist', [event.address.toHexString()]);
    return;
  }

  chest.amount = event.params.totalStaked.minus(chest.unstaked);
  chest.freezedUntil = event.params.freezedUntil;
  chest.booster = event.params.booster;

  chest.save();
}

export function handleStaked(event: Staked): void {
  let chest: Chest = new Chest(event.params.tokenId.toHexString());

  chest.user = event.params.user;
  chest.tokenId = event.params.tokenId;
  chest.amount = event.params.amount;
  chest.freezedUntil = event.params.freezedUntil;
  chest.vestingDuration = event.params.vestingDuration;
  chest.booster = event.params.booster;
  chest.nerfParameter = event.params.nerfParameter;

  chest.blockNumber = event.block.number;
  chest.blockTimestamp = event.block.timestamp;
  chest.transactionHash = event.transaction.hash;
  chest.unstaked = BigInt.fromI32(0);

  chest.save();
}

export function handleUnstake(event: Unstake): void {
  let chest = Chest.load(event.params.tokenId.toHexString());

  if (chest == null) {
    log.error('Unstake chest does not exist', [event.address.toString()]);
    return;
  }

  if (event.params.amount > chest.amount) {
    log.error('Requested amount cannot be bigger that current amount!', [event.address.toString()]);
    return;
  }

  chest.amount = event.params.totalStaked;
  chest.booster = event.params.booster;
  chest.unstaked = chest.unstaked.plus(event.params.amount);

  chest.save();
}
