import { VestedLiquidity, VestingLiquidityClaimed, VestedStaking, VestingStakingClaimed } from '../types/schema';
import {
  VestedLiqidty as VestedLiquidtyEvent,
  VestingLiquidityClaimed as VestingLiquidityClaimedEvent,
  VestedStaking as VestedStakingEvent,
  VestingStakingClaimed as VestingStakingClaimedEvent
} from '../types/templates/RewardVesting/RewardVesting';

export function handleVestedLiquidty(event: VestedLiquidtyEvent): void {
  let vestedLiquidity: VestedLiquidity = new VestedLiquidity(event.transaction.hash.toHex() + "-" + event.logIndex.toString());
  vestedLiquidity.timestamp = event.block.timestamp;
  vestedLiquidity.beneficiary = event.params.beneficiary;
  vestedLiquidity.amount = event.params.amount;
  vestedLiquidity.save();
}

export function handleVestingLiquidityClaimed(event: VestingLiquidityClaimedEvent): void {
  let vestedLiquidityClaimed: VestingLiquidityClaimed = new VestingLiquidityClaimed(event.transaction.hash.toHex() + "-" + event.logIndex.toString());
  vestedLiquidityClaimed.timestamp = event.block.timestamp;
  vestedLiquidityClaimed.beneficiary = event.params.beneficiary;
  vestedLiquidityClaimed.amount = event.params.amount;
  vestedLiquidityClaimed.save();
}

export function handleVestedStaking(event: VestedStakingEvent): void {
  let vestedStaking: VestedStaking = new VestedStaking(event.transaction.hash.toHex() + "-" + event.logIndex.toString());
  vestedStaking.timestamp = event.block.timestamp;
  vestedStaking.beneficiary = event.params.beneficiary;
  vestedStaking.amount = event.params.amount;
  vestedStaking.save();
}

export function handleVestingStakingClaimed(event: VestingStakingClaimedEvent): void {
  let vestingStakingClaimed: VestingStakingClaimed = new VestingStakingClaimed(event.transaction.hash.toHex() + "-" + event.logIndex.toString());
  vestingStakingClaimed.timestamp = event.block.timestamp;
  vestingStakingClaimed.beneficiary = event.params.beneficiary;
  vestingStakingClaimed.amount = event.params.amount;
  vestingStakingClaimed.save();
}
