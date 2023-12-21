import { EpochAdded, EpochRemoved, Claimed } from '../types/templates/LiquidityRewardDistribution/LiquidityRewardDistribution';
import { RewardDistributionSnapshot, UserRewardDistribution, SnapshotsUsersData } from '../types/schema';
import { log } from '@graphprotocol/graph-ts';
import { ipfs, json, JSONValue, store, Bytes, BigInt } from '@graphprotocol/graph-ts';
import { getDistributionData } from './helpers/rewardDistribution';

export function handleEpochAdded(event: EpochAdded): void {
  let snapshotId = event.params.Epoch; //primary key is epochId
  let ipfsCid = event.params._ipfs;
  let distributionsData = getDistributionData(ipfsCid);
  if (distributionsData.length == 0) {
    log.warning("There is a problem with geting data from ipfs", []);
    return;
  }

  for (let index = 0; index < distributionsData.length; index++) {
    let distribution = distributionsData[index];
    let key = snapshotId.toString() + "-" + distribution.address;
    log.debug("Distribution data to save {} {} {}", [distribution.amount, distribution.address, snapshotId.toString()]);

    let userSnapshot = new SnapshotsUsersData(key);
    userSnapshot.epochId = snapshotId;
    userSnapshot.initialAmount = BigInt.fromString(distribution.amount);
    userSnapshot.claimedAmount = BigInt.zero();
    userSnapshot.claimed = false;

    let userReward = UserRewardDistribution.load(distribution.address);
    if (userReward == null) {
      userReward = new UserRewardDistribution(distribution.address);
      userReward.amountOfClaimedToken = BigInt.zero();
      userReward.amountOfTokenAvailableForClaim = BigInt.fromString(distribution.amount);
    } else {
      userReward.amountOfTokenAvailableForClaim = userReward.amountOfTokenAvailableForClaim.plus(BigInt.fromString(distribution.amount));
    }
    userReward.save();

    userSnapshot.user = userReward.id;
    userSnapshot.save();
  }

  let snapshot = new RewardDistributionSnapshot(snapshotId.toString());
  snapshot.ipfsCid = ipfsCid;
  snapshot.blockNumber = event.block.number;
  snapshot.blockTimestamp = event.block.timestamp;
  snapshot.save();
}

export function handleEpochRemoved(event: EpochRemoved): void {
  let snapshotId = event.params.epoch;
  let snapshot = RewardDistributionSnapshot.load(snapshotId.toString());
  if (snapshot == null) {
    log.warning("There is no snapshot with epoch {}", [snapshotId.toString()]);
    return;
  }

  let ipfsCid = snapshot.ipfsCid;
  let distributionsData = getDistributionData(ipfsCid);

  if (distributionsData.length == 0) {
    log.warning("There is a problem with geting data from ipfs", []);
    return;
  }

  for (let index = 0; index < distributionsData.length; index++) {
    const distribution = distributionsData[index];
    let key = snapshotId.toString() + "-" + distribution.address;

    let userReward = UserRewardDistribution.load(distribution.address);
    if (userReward == null) {
      log.warning("The user {} does not have distribution", [distribution.address]);
      return;
    }

    let snapshotUser = SnapshotsUsersData.load(key.toString());
    if (snapshotUser == null) {
      log.warning("There is no snapshots for the {}", [key.toString()]);
      return;
    }
    if (snapshotUser.claimed) {
      log.warning("The user has claimed amount {} for the epoch {}", [snapshotUser.initialAmount.toString(), snapshotId.toString()]);
      return;
    }

    userReward.amountOfTokenAvailableForClaim = userReward.amountOfTokenAvailableForClaim.minus(BigInt.fromString(distribution.amount));
    userReward.save();

    store.remove("SnapshotsUsersData", key);
  }
  store.remove("Snapshot", snapshotId.toString());
}

export function handleClaimed(event: Claimed): void {
  let snapshotId = event.params.week;
  let address = event.params.claimant.toHexString();
  let amountToClaim = event.params.balance;

  let user = UserRewardDistribution.load(address);
  if (user == null) {
    log.warning("The user {} is not eligible for claim", [address]);
    return;
  }
  let key = snapshotId.toString() + "-" + address;
  let userSnapshots = SnapshotsUsersData.load(key);
  if (userSnapshots == null) {
    log.warning("There is no unclaimed snapshot for the user {}, epoch {}", [address, snapshotId.toString()]);
    return;
  }
  if (userSnapshots.initialAmount.lt(amountToClaim)) {
    log.warning("There is no enough amount for claim: available({}) < requested({})", [userSnapshots.initialAmount.toString(), amountToClaim.toString()]);
    return;
  }
  userSnapshots.claimedAmount = userSnapshots.claimedAmount.plus(amountToClaim);
  userSnapshots.claimed = true;

  user.amountOfTokenAvailableForClaim = user.amountOfTokenAvailableForClaim.minus(amountToClaim);
  user.amountOfClaimedToken = user.amountOfTokenAvailableForClaim.plus(amountToClaim);
  user.save();

  userSnapshots.user = user.id;
  userSnapshots.save();

}

