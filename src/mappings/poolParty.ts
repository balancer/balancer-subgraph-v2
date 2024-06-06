import { PoolPartyBurner } from '../types/schema';
import { BuyWithSei } from '../types/templates/PoolParty/PoolParty';

export function handleBuyWithSei(event: BuyWithSei): void {
  let userId = event.params.buyer;

  let poolPartyBurner = PoolPartyBurner.load(userId.toHexString());
  if (poolPartyBurner == null) {
    let newPoolPartyBurner = new PoolPartyBurner(userId.toHexString());
    newPoolPartyBurner.beneficiary = userId;
    newPoolPartyBurner.seiAmount = event.params.seiAmount;
    newPoolPartyBurner.jellyAmount = event.params.jellyAmount;

    newPoolPartyBurner.save();
    return;
  }
  poolPartyBurner.seiAmount = poolPartyBurner.seiAmount.plus(event.params.seiAmount);
  poolPartyBurner.jellyAmount = poolPartyBurner.jellyAmount.plus(event.params.jellyAmount);
  poolPartyBurner.save();
}
