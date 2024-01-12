import { Claimed as ClaimedEvent, EpochAdded as EpochAddedEvent, EpochRemoved as EpochRemovedEvent } from '../types/templates/LiquidityRewardDistribution/LiquidityRewardDistribution';
import { LiquidityRewardDistributionSnapshot, UserLiquidityRewardDistribution, UserLiquidityRewardDistributionMetaData, UserLiquidityData } from '../types/schema';
import { log, store, ipfs, Bytes, Address, BigInt } from '@graphprotocol/graph-ts'
import { getDistributionData } from './helpers/rewardDistribution';

export function handleClaimed(event: ClaimedEvent): void {
  let snapshotId = event.params.week;
  let address = event.params.claimant.toHexString();
  let amountToClaim = event.params.balance;

  let snapshot = LiquidityRewardDistributionSnapshot.load(snapshotId.toString());
  if (snapshot == null) {
    log.warning("There is no snapshot", []);
    return;
  }
  if (!snapshot.succesfullyFetch || snapshot.distributionData == null) {
    log.warning("The snapshot is not succesfully fetched", []);
    return;
  }

  let key = snapshot.ipfsCid + "-" + address;
  log.warning("The key to find user data {}", [key]);

  let user = UserLiquidityRewardDistribution.load(address);
  if (user == null) {
    log.warning("The user {} is not eligible for claim", [address]);
    return;
  }

  let userMetadata = UserLiquidityData.load(key);
  if (userMetadata == null) {
    log.warning("The USER {}", [key]);
    return;
  }

  if (userMetadata.initialAmount.lt(amountToClaim)) {
    log.warning("There is no enough amount for claim: available({}) < requested({})", [userMetadata.initialAmount.toString(), amountToClaim.toString()]);
    return;
  }
  userMetadata.claimedAmount = userMetadata.claimedAmount.plus(amountToClaim);
  userMetadata.claimed = true;

  user.amountOfTokenAvailableForClaim = user.amountOfTokenAvailableForClaim.minus(userMetadata.initialAmount);
  user.amountOfClaimedToken = user.amountOfClaimedToken.plus(amountToClaim);
  user.save();

  userMetadata.save();
}

export function handleEpochAdded(event: EpochAddedEvent): void {
  let snapshotId = event.params.Epoch; //primary key is epochId
  let ipfsCid = event.params._ipfs;
  log.warning("The ipf cid {}", [ipfsCid.toString()]);

  let snapshot = new LiquidityRewardDistributionSnapshot(snapshotId.toString());
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
  //UserRewardDistributionMetadataTemplate.create(ipfsCid);
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

function handleDistributionData(content: Bytes, cid: string): UserLiquidityRewardDistributionMetaData | null {
  let distributionsData = getDistributionData(content);
  if (distributionsData.length == 0) {
    log.warning("There is a problem with geting data from ipfs", []);
    return null;
  }

  let userRewardDistributionMetadata = new UserLiquidityRewardDistributionMetaData(cid);
  for (let index = 0; index < distributionsData.length; index++) {
    let distribution = distributionsData[index];
    log.warning("Distribution data to save {} {}", [distribution.amount, distribution.address]);
    let address = changetype<Address>(Address.fromHexString(distribution.address));
    let key = cid + "-" + address.toHexString();
    log.warning("The key for user data {}", [key]);
    let userData = new UserLiquidityData(key);
    userData.address = address;
    userData.initialAmount = BigInt.fromString(distribution.amount);
    userData.claimedAmount = BigInt.zero();
    userData.claimed = false;
    userRewardDistributionMetadata.save();
    userData.user = userRewardDistributionMetadata.id;
    userData.save();

    let userReward = UserLiquidityRewardDistribution.load(address.toHexString());
    if (userReward == null) {
      userReward = new UserLiquidityRewardDistribution(address.toHexString());
      userReward.amountOfClaimedToken = BigInt.zero();
      userReward.amountOfTokenAvailableForClaim = BigInt.fromString(distribution.amount);
    } else {
      userReward.amountOfTokenAvailableForClaim = userReward.amountOfTokenAvailableForClaim.plus(BigInt.fromString(distribution.amount));
    }
    userReward.save();
  }

  return userRewardDistributionMetadata;
}

export function handleEpochRemoved(event: EpochRemovedEvent): void {
  let snapshotId = event.params.epoch;
  let snapshot = LiquidityRewardDistributionSnapshot.load(snapshotId.toString());
  if (snapshot == null) {
    log.warning("There is no snapshot with epoch {}", [snapshotId.toString()]);
    return;
  }

  if (!snapshot.succesfullyFetch || snapshot.distributionData == null) {
    log.warning("The snapshot is not succesfully fetched", []);
    return;
  }

  let ipfsCid = snapshot.ipfsCid;
  let distributionsData = UserLiquidityRewardDistributionMetaData.load(ipfsCid);
  if (distributionsData == null) {
    log.warning("There is a problem with geting data from ipfs", []);
    return;
  }

  let users = distributionsData.users.load();
  for (let index = 0; index < users.length; index++) {
    const data = users.at(index);
    let userReward = UserLiquidityRewardDistribution.load(data.address.toString());
    if (userReward == null) {
      log.warning("The user {} does not have distribution", [data.address.toString()]);
      return;
    }
    if (data.claimed) {
      log.warning("The user has claimed amount {} for the epoch {}", [data.initialAmount.toString(), snapshotId.toString()]);
      return;
    }
    userReward.amountOfTokenAvailableForClaim = userReward.amountOfTokenAvailableForClaim.minus(data.initialAmount);
    if (userReward.amountOfTokenAvailableForClaim.equals(BigInt.zero())) {
      log.warning("Deleting user {}", [data.address.toString()]);
      store.remove("UserRewardDistribution", data.address.toString());
    } else {
      userReward.save();
    }
    store.remove("UserData", data.id);
  }
}
