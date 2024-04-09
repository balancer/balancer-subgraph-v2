import { PoolPartyBurner } from '../types/schema';
import { BuyWithUsd } from '../types/templates/PoolParty/PoolParty';

export function handleBuyWithUsd(event: BuyWithUsd): void {
  let userId = event.params.buyer;

  let poolPartyBurner = PoolPartyBurner.load(userId.toHexString());
  if (poolPartyBurner == null) {
    let newPoolPartyBurner = new PoolPartyBurner(userId.toHexString());
    newPoolPartyBurner.beneficiary = userId;
    newPoolPartyBurner.usdAmount = event.params.usdAmount;
    newPoolPartyBurner.jellyAmount = event.params.jellyAmount;

    newPoolPartyBurner.save();
    return;
  }
  poolPartyBurner.usdAmount = poolPartyBurner.usdAmount.plus(event.params.usdAmount);
  poolPartyBurner.jellyAmount = poolPartyBurner.jellyAmount.plus(event.params.jellyAmount);
  poolPartyBurner.save();
}
