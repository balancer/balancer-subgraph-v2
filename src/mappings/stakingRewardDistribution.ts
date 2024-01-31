import { Claimed as ClaimedEvent, EpochAdded as EpochAddedEvent, EpochRemoved as EpochRemovedEvent, Deposited as DepositedEvent } from '../types/templates/StakingRewardDistribution/StakingRewardDistribution';
import { StakingRewardDistributionSnapshot, UserStakingRewardDistributionMetaData, TokenClaimed, UserClaimedStakingRewardDistribution, TokenDeposited } from '../types/schema';
import { UserStakingRewardDistributionMetaData as UserStakingRewardDistributionMetaDataTemplate } from '../types/templates';
import { log, store, Bytes, Address, BigInt, dataSource } from '@graphprotocol/graph-ts'
import { getDistributionData, UserData } from './helpers/rewardDistribution';

export function handleClaimed(event: ClaimedEvent): void {
  let snapshotId = event.params.epoch;
  let address = event.params.claimant;
  let amount = event.params.balance;
  let tokenAddress = event.params.token;

  let snapshot = StakingRewardDistributionSnapshot.load(snapshotId.toString());
  if (snapshot == null) {
    log.warning("There is no snapshot", []);
    return;
  }

  let tokenKey = snapshot.ipfsCid.toString() + "-" + tokenAddress.toHexString();

  let tokenClaimed = new TokenClaimed(tokenKey);
  tokenClaimed.epochId = snapshotId;
  tokenClaimed.ipfsCid = snapshot.ipfsCid.toString();
  tokenClaimed.address = tokenAddress;
  tokenClaimed.amount = amount;

  let userClaimedData = UserClaimedStakingRewardDistribution.load(address.toHexString());
  if (userClaimedData == null) {
    userClaimedData = new UserClaimedStakingRewardDistribution(address.toHexString());
    userClaimedData.snapshots = [snapshotId];
    userClaimedData.save();
  } else {
    userClaimedData.snapshots.push(snapshotId);
    userClaimedData.save();
  }

  tokenClaimed.user = userClaimedData.id;
  tokenClaimed.save();
}

export function handleEpochAdded(event: EpochAddedEvent): void {
  let snapshotId = event.params.Epoch; //primary key is epochId
  let ipfsCid = event.params._ipfs;

  let snapshot = new StakingRewardDistributionSnapshot(snapshotId.toString());
  snapshot.blockNumber = event.block.number;
  snapshot.blockTimestamp = event.block.timestamp;
  snapshot.ipfsCid = ipfsCid;
  snapshot.ipfsData = ipfsCid;

  UserStakingRewardDistributionMetaDataTemplate.create(ipfsCid);
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
    let userRewardDistributionMetadata = new UserStakingRewardDistributionMetaData(key);
    userRewardDistributionMetadata.ipfsCid = dataSource.stringParam();
    userRewardDistributionMetadata.address = address;
    userRewardDistributionMetadata.value = BigInt.fromString(distribution.amount);
    userRewardDistributionMetadata.save();
  }
}

export function handleEpochRemoved(event: EpochRemovedEvent): void {
  let snapshotId = event.params.epoch;
  let snapshot = StakingRewardDistributionSnapshot.load(snapshotId.toString());
  if (snapshot == null) {
    log.warning("There is no snapshot with epoch {}", [snapshotId.toString()]);
    return;
  }

  store.remove("StakingRewardDistributionSnapshot", snapshot.id);
}

export function handleDeposited(event: DepositedEvent): void {
  let epochId = event.params.epoch;
  let token = event.params.token;
  let amount = event.params.amount;

  let tokenDeposited = new TokenDeposited(epochId.toString() + "-" + token.toHexString());
  tokenDeposited.epochId = epochId;
  tokenDeposited.token = token;
  tokenDeposited.amount = amount;

  tokenDeposited.save();
}
