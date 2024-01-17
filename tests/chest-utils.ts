import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  Approval,
  ApprovalForAll,
  FeeWithdrawn,
  IncreaseStake,
  NewVestingPosition,
  OwnershipTransferCanceled,
  OwnershipTransferRequested,
  OwnershipTransferred,
  SetFee,
  SetMaxBooster,
  Staked,
  Transfer,
  Unstake
} from "../generated/Chest/Chest"

export function createApprovalEvent(
  owner: Address,
  approved: Address,
  tokenId: BigInt
): Approval {
  let approvalEvent = changetype<Approval>(newMockEvent())

  approvalEvent.parameters = new Array()

  approvalEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  approvalEvent.parameters.push(
    new ethereum.EventParam("approved", ethereum.Value.fromAddress(approved))
  )
  approvalEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )

  return approvalEvent
}

export function createApprovalForAllEvent(
  owner: Address,
  operator: Address,
  approved: boolean
): ApprovalForAll {
  let approvalForAllEvent = changetype<ApprovalForAll>(newMockEvent())

  approvalForAllEvent.parameters = new Array()

  approvalForAllEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  approvalForAllEvent.parameters.push(
    new ethereum.EventParam("operator", ethereum.Value.fromAddress(operator))
  )
  approvalForAllEvent.parameters.push(
    new ethereum.EventParam("approved", ethereum.Value.fromBoolean(approved))
  )

  return approvalForAllEvent
}

export function createFeeWithdrawnEvent(beneficiary: Address): FeeWithdrawn {
  let feeWithdrawnEvent = changetype<FeeWithdrawn>(newMockEvent())

  feeWithdrawnEvent.parameters = new Array()

  feeWithdrawnEvent.parameters.push(
    new ethereum.EventParam(
      "beneficiary",
      ethereum.Value.fromAddress(beneficiary)
    )
  )

  return feeWithdrawnEvent
}

export function createIncreaseStakeEvent(
  tokenId: BigInt,
  totalStaked: BigInt,
  freezedUntil: BigInt,
  booster: BigInt
): IncreaseStake {
  let increaseStakeEvent = changetype<IncreaseStake>(newMockEvent())

  increaseStakeEvent.parameters = new Array()

  increaseStakeEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )
  increaseStakeEvent.parameters.push(
    new ethereum.EventParam(
      "totalStaked",
      ethereum.Value.fromUnsignedBigInt(totalStaked)
    )
  )
  increaseStakeEvent.parameters.push(
    new ethereum.EventParam(
      "freezedUntil",
      ethereum.Value.fromUnsignedBigInt(freezedUntil)
    )
  )
  increaseStakeEvent.parameters.push(
    new ethereum.EventParam(
      "booster",
      ethereum.Value.fromUnsignedBigInt(booster)
    )
  )

  return increaseStakeEvent
}

export function createNewVestingPositionEvent(
  position: ethereum.Tuple,
  index: BigInt
): NewVestingPosition {
  let newVestingPositionEvent = changetype<NewVestingPosition>(newMockEvent())

  newVestingPositionEvent.parameters = new Array()

  newVestingPositionEvent.parameters.push(
    new ethereum.EventParam("position", ethereum.Value.fromTuple(position))
  )
  newVestingPositionEvent.parameters.push(
    new ethereum.EventParam("index", ethereum.Value.fromUnsignedBigInt(index))
  )

  return newVestingPositionEvent
}

export function createOwnershipTransferCanceledEvent(
  from: Address,
  to: Address
): OwnershipTransferCanceled {
  let ownershipTransferCanceledEvent = changetype<OwnershipTransferCanceled>(
    newMockEvent()
  )

  ownershipTransferCanceledEvent.parameters = new Array()

  ownershipTransferCanceledEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  ownershipTransferCanceledEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )

  return ownershipTransferCanceledEvent
}

export function createOwnershipTransferRequestedEvent(
  from: Address,
  to: Address
): OwnershipTransferRequested {
  let ownershipTransferRequestedEvent = changetype<OwnershipTransferRequested>(
    newMockEvent()
  )

  ownershipTransferRequestedEvent.parameters = new Array()

  ownershipTransferRequestedEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  ownershipTransferRequestedEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )

  return ownershipTransferRequestedEvent
}

export function createOwnershipTransferredEvent(
  from: Address,
  to: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )

  return ownershipTransferredEvent
}

export function createSetFeeEvent(fee: BigInt): SetFee {
  let setFeeEvent = changetype<SetFee>(newMockEvent())

  setFeeEvent.parameters = new Array()

  setFeeEvent.parameters.push(
    new ethereum.EventParam("fee", ethereum.Value.fromUnsignedBigInt(fee))
  )

  return setFeeEvent
}

export function createSetMaxBoosterEvent(maxBooster: BigInt): SetMaxBooster {
  let setMaxBoosterEvent = changetype<SetMaxBooster>(newMockEvent())

  setMaxBoosterEvent.parameters = new Array()

  setMaxBoosterEvent.parameters.push(
    new ethereum.EventParam(
      "maxBooster",
      ethereum.Value.fromUnsignedBigInt(maxBooster)
    )
  )

  return setMaxBoosterEvent
}

export function createStakedEvent(
  user: Address,
  tokenId: BigInt,
  amount: BigInt,
  freezedUntil: BigInt,
  vestingDuration: BigInt,
  booster: BigInt,
  nerfParameter: i32
): Staked {
  let stakedEvent = changetype<Staked>(newMockEvent())

  stakedEvent.parameters = new Array()

  stakedEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  stakedEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )
  stakedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  stakedEvent.parameters.push(
    new ethereum.EventParam(
      "freezedUntil",
      ethereum.Value.fromUnsignedBigInt(freezedUntil)
    )
  )
  stakedEvent.parameters.push(
    new ethereum.EventParam(
      "vestingDuration",
      ethereum.Value.fromUnsignedBigInt(vestingDuration)
    )
  )
  stakedEvent.parameters.push(
    new ethereum.EventParam(
      "booster",
      ethereum.Value.fromUnsignedBigInt(booster)
    )
  )
  stakedEvent.parameters.push(
    new ethereum.EventParam(
      "nerfParameter",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(nerfParameter))
    )
  )

  return stakedEvent
}

export function createTransferEvent(
  from: Address,
  to: Address,
  tokenId: BigInt
): Transfer {
  let transferEvent = changetype<Transfer>(newMockEvent())

  transferEvent.parameters = new Array()

  transferEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  transferEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  transferEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )

  return transferEvent
}

export function createUnstakeEvent(
  tokenId: BigInt,
  amount: BigInt,
  totalStaked: BigInt,
  booster: BigInt
): Unstake {
  let unstakeEvent = changetype<Unstake>(newMockEvent())

  unstakeEvent.parameters = new Array()

  unstakeEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )
  unstakeEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  unstakeEvent.parameters.push(
    new ethereum.EventParam(
      "totalStaked",
      ethereum.Value.fromUnsignedBigInt(totalStaked)
    )
  )
  unstakeEvent.parameters.push(
    new ethereum.EventParam(
      "booster",
      ethereum.Value.fromUnsignedBigInt(booster)
    )
  )

  return unstakeEvent
}
