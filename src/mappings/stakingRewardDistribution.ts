import {
  Claimed as ClaimedEvent,
  Deposited as DepositedEvent,
  EpochAdded as EpochAddedEvent,
  EpochRemoved as EpochRemovedEvent,
} from '../types/templates/StakingRewardDistribution/StakingRewardDistribution';
import {
  StakingRewardDistributionSnapshot,
  UserStakingData,
  UserStakingRewardDistributionMetaData,
  TokenDeposited
} from '../types/schema';
import {
  log,
  store,
  ipfs,
  Bytes,
  Address,
  BigInt,
} from '@graphprotocol/graph-ts'
import { getDistributionData } from './helpers/rewardDistribution';

export function handleClaimed(event: ClaimedEvent): void {
  // TODO! No epoch ID - check to add
  let snapshotId = event.block.timestamp;
  let address = event.params.claimant.toHexString();
  let amountToClaim = event.params.balance;
  let token = event.params.token;

  let snapshot = StakingRewardDistributionSnapshot.load(snapshotId.toString());
  if (snapshot == null) {
    log.warning("There is no snapshot", []);
    return;
  }
  if (snapshot.distributionData == null) {
    log.warning("The snapshot is not succesfully fetched", []);
    return;
  }

  let tokenDeposited = TokenDeposited.load(snapshotId.toString() + "-" + token.toHexString());
  if (tokenDeposited == null) {
    log.warning("There is not token deposited for this epoch ", []);
    return;
  }

  let key = snapshot.ipfsCid + "-" + address;
  log.warning("The key to find user data {}", [key]);

  let userMetadata = UserStakingData.load(key);
  if (userMetadata == null) {
    log.warning("The USER {}", [key]);
    return;
  }

  userMetadata.tokens = [tokenDeposited.id];

  userMetadata.claimedAmount = userMetadata.claimedAmount.plus(amountToClaim);
  userMetadata.claimed = true;

  userMetadata.save();
}

export function handleDeposited(event: DepositedEvent): void {
  // TODO! Epoch Id - CHECK if this need to be filter by epoch ID? 
  let epochId = event.block.timestamp;
  let token = event.params.token.toHexString();
  let amount = event.params.amount;

  let tokenDeposited = new TokenDeposited(epochId.toString() + "-" + token);
  tokenDeposited.token = changetype<Address>(Address.fromHexString(token));
  tokenDeposited.amount = amount;

  tokenDeposited.save();
}

export function handleEpochAdded(event: EpochAddedEvent): void {
  let snapshotId = event.params.Epoch; //primary key is epochId
  let ipfsCid = event.params._ipfs;
  log.warning("The ipf cid {}", [ipfsCid.toString()]);

  let snapshot = new StakingRewardDistributionSnapshot(snapshotId.toString());
  snapshot.blockNumber = event.block.number;
  snapshot.blockTimestamp = event.block.timestamp;
  snapshot.ipfsCid = ipfsCid;

  let ipfsBytes = ipfs.cat(ipfsCid);
  if (!ipfsBytes) {
    log.warning("There is no ipfs data found for {}", [ipfsCid]);
    snapshot.succesfullyFetch = false;
    snapshot.save();
    return;
  }

  let distributionsData = handleDistributionData(ipfsBytes, ipfsCid);
  if (distributionsData == null) {
    log.warning("There is no data for {}", [ipfsCid]);
    snapshot.succesfullyFetch = false;
    snapshot.save();
    return;
  }

  snapshot.distributionData = distributionsData.id;
  snapshot.succesfullyFetch = true;
  snapshot.save();
}

function handleDistributionData(content: Bytes, cid: string): UserStakingRewardDistributionMetaData | null {
  let distributionsData = getDistributionData(content);
  if (distributionsData.length == 0) {
    log.warning("There is a problem with geting data from ipfs", []);
    return null;
  }

  let userRewardDistributionMetadata = new UserStakingRewardDistributionMetaData(cid);
  for (let index = 0; index < distributionsData.length; index++) {
    let distribution = distributionsData[index];
    log.warning("Distribution data to save {} {}", [distribution.amount, distribution.address]);
    let address = changetype<Address>(Address.fromHexString(distribution.address));
    let key = cid + "-" + address.toHexString();
    log.warning("The key for user data {}", [key]);
    let userData = new UserStakingData(key);
    userData.address = address;
    userData.tokens = [];
    userData.votingPower = BigInt.fromString(distribution.amount);
    userData.claimedAmount = BigInt.zero();
    userData.claimed = false;
    userRewardDistributionMetadata.save();
    userData.user = userRewardDistributionMetadata.id;
    userData.save();
  }

  return userRewardDistributionMetadata;
}

export function handleEpochRemoved(event: EpochRemovedEvent): void {
  let snapshotId = event.params.epoch;
  let snapshot = StakingRewardDistributionSnapshot.load(snapshotId.toString());
  if (snapshot == null) {
    log.warning("There is no snapshot with epoch {}", [snapshotId.toString()]);
    return;
  }

  if (!snapshot.succesfullyFetch || snapshot.distributionData == null) {
    log.warning("The snapshot is not succesfully fetched", []);
    return;
  }

  let ipfsCid = snapshot.ipfsCid;
  let distributionsData = UserStakingRewardDistributionMetaData.load(ipfsCid);
  if (distributionsData == null) {
    log.warning("There is a problem with geting data from ipfs", []);
    return;
  }

  let users = distributionsData.users.load();
  for (let index = 0; index < users.length; index++) {
    const data = users.at(index);
    if (data.claimed) {
      log.warning("The user has claimed amount {} for the epoch {}", [data.claimedAmount.toString(), snapshotId.toString()]);
      return;
    }
    store.remove("UserStakingData", data.id);
  }
}
