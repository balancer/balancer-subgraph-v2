import { BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import { Chest } from '../types/schema';
import {
  IncreaseStake as IncreaseStakeEvent,
  Staked as ChestEvent,
  Unstake as UnstakeEvent,
} from '../types/templates/Chest/Chest';

export function handleIncreaseStake(event: IncreaseStakeEvent): void {
  let chest = Chest.load(Bytes.fromBigInt(event.params.tokenId));

  if (chest == null) {
    log.error('Chest does not exist', [event.address.toHexString()]);
    return;
  }

  chest.amount = event.params.totalStaked;
  chest.freezedUntil = event.params.freezedUntil;
  chest.booster = event.params.booster;

  chest.save();
}

export function handleStaked(event: ChestEvent): void {
  let chest: Chest = new Chest(Bytes.fromBigInt(event.params.tokenId));

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

  chest.save();
}

export function handleUnstake(event: UnstakeEvent): void {
  let chest = Chest.load(Bytes.fromBigInt(event.params.tokenId));

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

  chest.save();
}
