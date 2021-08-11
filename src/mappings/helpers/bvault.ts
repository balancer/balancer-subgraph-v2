import { Address, BigDecimal, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { Balancer, BalancerSnapshot } from '../../types/schema';
import { ZERO, ZERO_BD } from './constants';

export function getBalancerSnapshot(vaultId: string, timestamp: BigInt) {
    let dayID = timestamp.toI32() / 86400;
    let id = vaultId + '-' + dayID.toString();
    let dayData = BalancerSnapshot.load(id);

    if (dayData == null) {
        let dayStartTimestamp = dayID * 86400;
        dayData = new BalancerSnapshot(id);
        dayData.poolCount = ZERO;
        dayData.totalLiquidity = ZERO_BD;
        dayData.totalSwapFee = ZERO_BD;
        dayData.totalSwapVolume = ZERO_BD;
        dayData.vault = vaultId;
        dayData.timestamp = BigInt.fromI32(dayStartTimestamp);
        dayData.save();
    }

    return dayData as BalancerSnapshot;
}