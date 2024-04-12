import {
  Claimed as ClaimedEvent,
  EpochAdded as EpochAddedEvent,
  Deposited as DepositedEvent,
} from '../types/templates/StakingRewardDistribution/StakingRewardDistribution';
import {
  StakingMerkleTree,
  StakingRewardDistributionSnapshot,
  UserStakingRewardDistributionMetaData,
  TokenClaimed,
  UserClaimedStakingRewardDistribution,
  TokenDeposited,
} from '../types/schema';
import { UserStakingRewardDistributionMetaData as UserStakingRewardDistributionMetaDataTemplate } from '../types/templates';
import { log, store, Bytes, Address, BigInt, dataSource, ipfs } from '@graphprotocol/graph-ts';
import { getDistributionData, UserData } from './helpers/rewardDistribution';

export function handleClaimed(event: ClaimedEvent): void {
  let snapshotId = event.params.epoch;
  let address = event.params.claimant;
  let amount = event.params.balance;
  let tokenAddress = event.params.token;

  let snapshot = StakingRewardDistributionSnapshot.load(snapshotId.toString());
  if (snapshot == null) {
    log.warning('There is no snapshot', []);
    return;
  }

  let tokenKey = snapshotId.toString() + '-' + tokenAddress.toHexString() + '-' + address.toHexString();

  let tokenClaimed = new TokenClaimed(tokenKey);
  tokenClaimed.amount = amount;
  tokenClaimed.epochId = snapshotId;
  tokenClaimed.ipfsCid = snapshot.ipfsCid.toString();
  tokenClaimed.address = tokenAddress;

  let userClaimedData = UserClaimedStakingRewardDistribution.load(address.toHexString());
  if (userClaimedData == null) {
    log.warning('New climed addr {}', [address.toHexString()]);
    userClaimedData = new UserClaimedStakingRewardDistribution(address.toHexString());
    userClaimedData.snapshots = [snapshotId];
  } else {
    log.warning('Already claimed {}, add new snapshot {}, old snapshots {}', [
      address.toHexString(),
      userClaimedData.snapshots.toString(),
      snapshotId.toString(),
    ]);
    let snapshots = userClaimedData.snapshots;
    snapshots.push(snapshotId);
    userClaimedData.snapshots = snapshots;
  }
  userClaimedData.save();

  tokenClaimed.user = userClaimedData.id;
  tokenClaimed.save();
}

export function handleEpochAdded(event: EpochAddedEvent): void {
  let snapshotId = event.params.epoch; //primary key is epochId
  let ipfsCid = event.params.ipfs;

  let snapshot = new StakingRewardDistributionSnapshot(snapshotId.toString());
  snapshot.blockNumber = event.block.number;
  snapshot.blockTimestamp = event.block.timestamp;
  snapshot.ipfsCid = ipfsCid;
  snapshot.ipfsData = ipfsCid;
  snapshot.ipfsMerkleTree = ipfsCid;

  UserStakingRewardDistributionMetaDataTemplate.create(ipfsCid);
  snapshot.save();
}

export function handleMetaData(content: Bytes): void {
  let stakingMerkleTree = new StakingMerkleTree(dataSource.stringParam());
  stakingMerkleTree.merkleTree = content;
  stakingMerkleTree.save();

  let distributionsData: UserData[] = getDistributionData(content);
  if (distributionsData.length == 0) {
    log.warning('There is a problem with geting data from ipfs', []);
    return;
  }

  for (let index = 0; index < distributionsData.length; index++) {
    let distribution = distributionsData[index];
    log.warning('Distribution SP data to save {} {}', [distribution.amount, distribution.address]);
    let address = changetype<Address>(Address.fromHexString(distribution.address));
    let key = dataSource.stringParam() + '-' + address.toHexString();
    let userRewardDistributionMetadata = new UserStakingRewardDistributionMetaData(key);
    userRewardDistributionMetadata.epoch = BigInt.fromString(distribution.epoch);
    userRewardDistributionMetadata.ipfsCid = dataSource.stringParam();
    userRewardDistributionMetadata.address = address;
    userRewardDistributionMetadata.value = BigInt.fromString(distribution.amount);
    userRewardDistributionMetadata.save();
  }
}

export function handleDeposited(event: DepositedEvent): void {
  let epochId = event.params.epoch;
  let token = event.params.token;
  let amount = event.params.amount;

  let tokenDeposited = TokenDeposited.load(epochId.toString() + '-' + token.toHexString());
  if (tokenDeposited == null) {
    tokenDeposited = new TokenDeposited(epochId.toString() + '-' + token.toHexString());
    tokenDeposited.amount = amount;
  } else {
    tokenDeposited.amount = tokenDeposited.amount.plus(amount);
  }
  tokenDeposited.epochId = epochId;
  tokenDeposited.token = token;
  tokenDeposited.blockTimestamp = event.block.timestamp;

  tokenDeposited.save();
}
