import {
  Claimed as ClaimedEvent,
  EpochAdded as EpochAddedEvent,
} from '../types/templates/LPRewardDistribution/LPRewardDistribution';
import {
  LPMerkleTree,
  LPRewardDistributionSnapshot,
  UserLPRewardDistributionMetaData,
  UserClaimedLPRewardDistribution,
} from '../types/schema';
import { UserLPRewardDistributionMetaData as UserLPRewardDistributionMetaDataTemplate } from '../types/templates';
import { log, store, Bytes, Address, BigInt, dataSource } from '@graphprotocol/graph-ts';
import { getDistributionData, UserData } from './helpers/rewardDistribution';

export function handleClaimed(event: ClaimedEvent): void {
  let snapshotId = event.params.epoch;
  let address = event.params.claimant;
  let amountToClaim = event.params.balance;

  let userClaimedData = UserClaimedLPRewardDistribution.load(address.toHexString());
  if (userClaimedData == null) {
    userClaimedData = new UserClaimedLPRewardDistribution(address.toHexString());
    userClaimedData.snapshots = [snapshotId];
    userClaimedData.totalAmountOfClaimedToken = amountToClaim;
  } else {
    let snapshots = userClaimedData.snapshots;
    snapshots.push(snapshotId);
    userClaimedData.snapshots = snapshots;
    userClaimedData.totalAmountOfClaimedToken = userClaimedData.totalAmountOfClaimedToken.plus(amountToClaim);
  }
  userClaimedData.save();
}

export function handleEpochAdded(event: EpochAddedEvent): void {
  let snapshotId = event.params.epoch; //primary key is epochId
  let ipfsCid = event.params.ipfs;

  let snapshot = new LPRewardDistributionSnapshot(snapshotId.toString());
  snapshot.blockNumber = event.block.number;
  snapshot.blockTimestamp = event.block.timestamp;
  snapshot.ipfsCid = ipfsCid;
  snapshot.ipfsData = ipfsCid;
  snapshot.ipfsMerkleTree = ipfsCid;

  UserLPRewardDistributionMetaDataTemplate.create(ipfsCid);
  snapshot.save();
}

export function handleMetaData(content: Bytes): void {
  let lpMerkleTree = new LPMerkleTree(dataSource.stringParam());
  lpMerkleTree.merkleTree = content;
  lpMerkleTree.save();

  let distributionsData: UserData[] = getDistributionData(content);
  if (distributionsData.length == 0) {
    log.warning('There is a problem with geting data from ipfs', []);
    return;
  }

  for (let index = 0; index < distributionsData.length; index++) {
    let distribution = distributionsData[index];
    log.warning('Distribution LP data to save {} {}', [distribution.amount, distribution.address]);
    let address = changetype<Address>(Address.fromHexString(distribution.address));
    let key = dataSource.stringParam() + '-' + address.toHexString();
    let userRewardDistributionMetadata = new UserLPRewardDistributionMetaData(key);
    userRewardDistributionMetadata.epoch = BigInt.fromString(distribution.epoch);
    userRewardDistributionMetadata.ipfsCid = dataSource.stringParam();
    userRewardDistributionMetadata.address = address;
    userRewardDistributionMetadata.value = BigInt.fromString(distribution.amount);
    userRewardDistributionMetadata.save();
  }
}
