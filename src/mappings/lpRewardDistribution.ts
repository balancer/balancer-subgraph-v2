import { Claimed as ClaimedEvent, EpochAdded as EpochAddedEvent, EpochRemoved as EpochRemovedEvent } from '../types/templates/LPRewardDistribution/LPRewardDistribution';
import { LPRewardDistributionSnapshot, UserLPRewardDistributionMetaData, UserClaimedLPRewardDistribution, SnapshotLPRewardDistribution, UserLPData } from '../types/schema';
import { UserLPRewardDistributionMetaData as UserLPRewardDistributionMetaDataTemplate } from '../types/templates';
import { log, store, Bytes, Address, BigInt, dataSource } from '@graphprotocol/graph-ts'
import { getDistributionData, UserData } from './helpers/rewardDistribution';

export function handleClaimed(event: ClaimedEvent): void {
  let snapshotId = event.params.week;
  let address = event.params.claimant;
  let amountToClaim = event.params.balance;

  let snapshot = LPRewardDistributionSnapshot.load(snapshotId.toString());
  if (snapshot == null) {
    log.warning("There is no snapshot", []);
    return;
  }

  let key = snapshot.ipfsCid.toString() + "-" + address.toHexString();
  let userClaimedData = UserClaimedLPRewardDistribution.load(address.toHexString());
  if (userClaimedData == null) {
    userClaimedData = new UserClaimedLPRewardDistribution(address.toHexString());
    userClaimedData.totalAmountOfClaimedToken = amountToClaim;
    userClaimedData.save();
    return;
  } else {
    userClaimedData.totalAmountOfClaimedToken = userClaimedData.totalAmountOfClaimedToken.plus(amountToClaim);
    userClaimedData.save();
  }

  let userData = new UserLPData(key);
  userData.address = address;
  userData.claimedAmount = amountToClaim;
  let snapshotData = SnapshotLPRewardDistribution.load(snapshot.ipfsCid.toString());
  if (snapshotData == null) {
    snapshotData = new SnapshotLPRewardDistribution(snapshot.ipfsCid.toString());
    snapshotData.save();
  }
  userData.user = snapshotData.id;
  userData.save();
}

export function handleEpochAdded(event: EpochAddedEvent): void {
  let snapshotId = event.params.Epoch; //primary key is epochId
  let ipfsCid = event.params._ipfs;

  let snapshot = new LPRewardDistributionSnapshot(snapshotId.toString());
  snapshot.blockNumber = event.block.number;
  snapshot.blockTimestamp = event.block.timestamp;
  snapshot.ipfsCid = ipfsCid;
  snapshot.ipfsData = ipfsCid;

  UserLPRewardDistributionMetaDataTemplate.create(ipfsCid);
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
    let userRewardDistributionMetadata = new UserLPRewardDistributionMetaData(key);
    userRewardDistributionMetadata.address = address;
    userRewardDistributionMetadata.value = BigInt.fromString(distribution.amount);
    userRewardDistributionMetadata.save();
  }
}

export function handleEpochRemoved(event: EpochRemovedEvent): void {
  let snapshotId = event.params.epoch;
  let snapshot = LPRewardDistributionSnapshot.load(snapshotId.toString());
  if (snapshot == null) {
    log.warning("There is no snapshot with epoch {}", [snapshotId.toString()]);
    return;
  }

  let ipfsCid = snapshot.ipfsCid;
  let distributionsData = SnapshotLPRewardDistribution.load(ipfsCid);
  if (distributionsData == null) {
    log.warning("There is a problem with geting data from ipfs", []);
    return;
  }

  let users = distributionsData.users.load();
  if (users.length > 1) {
    log.warning("There is claimed data for the epoch {}, remove can not be done ", [ipfsCid]);
    return;
  }
  store.remove("LPRewardDistributionSnapshot", snapshot.id);
}
