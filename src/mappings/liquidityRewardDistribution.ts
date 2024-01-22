import { Claimed as ClaimedEvent, EpochAdded as EpochAddedEvent, EpochRemoved as EpochRemovedEvent } from '../types/templates/LiquidityRewardDistribution/LiquidityRewardDistribution';
import { LiquidityRewardDistributionSnapshot, UserLiquidityRewardDistributionMetaData, UserClaimedLiquidityRewardDistribution, SnapshotLiquidityRewardDistribution, UserLiquidityData } from '../types/schema';
import { UserLiquidityRewardDistributionMetaData as UserLiquidityRewardDistributionMetaDataTemplate } from '../types/templates';
import { log, store, Bytes, Address, BigInt, dataSource } from '@graphprotocol/graph-ts'
import { getDistributionData, UserData } from './helpers/rewardDistribution';

export function handleClaimed(event: ClaimedEvent): void {
  let snapshotId = event.params.week;
  let address = event.params.claimant;
  let amountToClaim = event.params.balance;

  let snapshot = LiquidityRewardDistributionSnapshot.load(snapshotId.toString());
  if (snapshot == null) {
    log.warning("There is no snapshot", []);
    return;
  }

  let key = snapshot.ipfsCid.toString() + "-" + address.toHexString();
  let userClaimedData = UserClaimedLiquidityRewardDistribution.load(address.toHexString());
  if (userClaimedData == null) {
    userClaimedData = new UserClaimedLiquidityRewardDistribution(address.toHexString());
    userClaimedData.totalAmountOfClaimedToken = amountToClaim;
    userClaimedData.save();
    return;
  } else {
    userClaimedData.totalAmountOfClaimedToken = userClaimedData.totalAmountOfClaimedToken.plus(amountToClaim);
    userClaimedData.save();
  }

  let userData = new UserLiquidityData(key);
  userData.address = address;
  userData.claimedAmount = amountToClaim;
  let snapshotData = SnapshotLiquidityRewardDistribution.load(snapshot.ipfsCid.toString());
  if (snapshotData == null) {
    snapshotData = new SnapshotLiquidityRewardDistribution(snapshot.ipfsCid.toString());
    snapshotData.save();
  }
  userData.user = snapshotData.id;
  userData.save();
}

export function handleEpochAdded(event: EpochAddedEvent): void {
  let snapshotId = event.params.Epoch; //primary key is epochId
  let ipfsCid = event.params._ipfs;

  let snapshot = new LiquidityRewardDistributionSnapshot(snapshotId.toString());
  snapshot.blockNumber = event.block.number;
  snapshot.blockTimestamp = event.block.timestamp;
  snapshot.ipfsCid = ipfsCid;
  snapshot.ipfsCid = ipfsCid;

  UserLiquidityRewardDistributionMetaDataTemplate.create(ipfsCid);
  snapshot.save();
}

export function handleMetaData(content: Bytes): void {
  let distributionsData: UserData[] = getDistributionData(content);
  if (distributionsData.length == 0) {
    log.warning("There is a problem with geting data from ipfs", []);
    return;
  }

  for (let index = 0; index < distributionsData.length; index++) {
    let distribution = distributionsData[index];
    log.warning("Distribution data to save {} {}", [distribution.amount, distribution.address]);
    let address = changetype<Address>(Address.fromHexString(distribution.address));
    let key = dataSource.stringParam() + "-" + address.toHexString();
    let userRewardDistributionMetadata = new UserLiquidityRewardDistributionMetaData(key);
    userRewardDistributionMetadata.address = address;
    userRewardDistributionMetadata.value = BigInt.fromString(distribution.amount);
    userRewardDistributionMetadata.save();
  }
}

export function handleEpochRemoved(event: EpochRemovedEvent): void {
  let snapshotId = event.params.epoch;
  let snapshot = LiquidityRewardDistributionSnapshot.load(snapshotId.toString());
  if (snapshot == null) {
    log.warning("There is no snapshot with epoch {}", [snapshotId.toString()]);
    return;
  }

  let ipfsCid = snapshot.ipfsCid;
  let distributionsData = SnapshotLiquidityRewardDistribution.load(ipfsCid);
  if (distributionsData == null) {
    log.warning("There is a problem with geting data from ipfs", []);
    return;
  }

  let users = distributionsData.users.load();
  if (users.length > 1) {
    log.warning("There is claimed data for the epoch {}, remove can not be done ", [ipfsCid]);
    return;
  }
  store.remove("LiquidityRewardDistributionSnapshot", snapshot.id);
}
