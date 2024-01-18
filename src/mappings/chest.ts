import { Bytes, BigInt, log } from '@graphprotocol/graph-ts';
import { Chest } from '../types/schema';
import {
  IncreaseStake as IncreaseStakeEvent,
  Staked as ChestEvent,
  Unstake as UnstakeEvent,
} from '../types/templates/Chest/Chest';

export function handleIncreaseStake(event: IncreaseStakeEvent): void {
  let entity = new Chest(Bytes.fromBigInt(event.params.tokenId));

  if (entity == null) {
    log.error('Chest entity does not exist', [event.address.toHexString()]);
    return;
  }

  entity.tokenId = event.params.tokenId;
  entity.totalStaked = entity.totalStaked.plus(event.params.totalStaked);
  entity.freezedUntil = entity.freezedUntil.plus(event.params.freezedUntil);
  entity.booster = event.params.booster;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleStaked(event: ChestEvent): void {
  let entity: Chest = new Chest(event.address);

  entity.user = event.params.user;
  entity.tokenId = event.params.tokenId;
  entity.amount = event.params.amount;
  entity.freezedUntil = event.params.freezedUntil;
  entity.vestingDuration = event.params.vestingDuration;
  entity.booster = event.params.booster;
  entity.nerfParameter = event.params.nerfParameter;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.totalStaked = BigInt.fromI32(0);

  entity.save();
}

export function handleUnstake(event: UnstakeEvent): void {
  let entity = Chest.load(Bytes.fromBigInt(event.params.tokenId));

  if (entity == null) {
    log.error('Unstake entity does not exist', [event.address.toString()]);
    return;
  }

  if (event.params.amount > entity.amount) {
    log.error('Requested amount cannot be bigger that current amount!', [event.address.toString()]);
    return;
  }

  entity.tokenId = event.params.tokenId;
  entity.amount = event.params.amount;
  entity.totalStaked = event.params.totalStaked;
  entity.booster = event.params.booster;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.totalUnstaked = entity.totalUnstaked.plus(event.params.amount);

  entity.save();
}
