import {
  Approval as ApprovalEvent,
  ApprovalForAll as ApprovalForAllEvent,
  FeeWithdrawn as FeeWithdrawnEvent,
  IncreaseStake as IncreaseStakeEvent,
  NewVestingPosition as NewVestingPositionEvent,
  OwnershipTransferCanceled as OwnershipTransferCanceledEvent,
  OwnershipTransferRequested as OwnershipTransferRequestedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  SetFee as SetFeeEvent,
  SetMaxBooster as SetMaxBoosterEvent,
  Staked as StakedEvent,
  Transfer as TransferEvent,
  Unstake as UnstakeEvent,
} from "../generated/Chest/Chest"
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
  Unstake,
} from "../generated/schema"

export function handleApproval(event: ApprovalEvent): void {
  let entity = new Approval(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.owner = event.params.owner
  entity.approved = event.params.approved
  entity.tokenId = event.params.tokenId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleApprovalForAll(event: ApprovalForAllEvent): void {
  let entity = new ApprovalForAll(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.owner = event.params.owner
  entity.operator = event.params.operator
  entity.approved = event.params.approved

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleFeeWithdrawn(event: FeeWithdrawnEvent): void {
  let entity = new FeeWithdrawn(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.beneficiary = event.params.beneficiary

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleIncreaseStake(event: IncreaseStakeEvent): void {
  let entity = new IncreaseStake(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.tokenId = event.params.tokenId
  entity.totalStaked = event.params.totalStaked
  entity.freezedUntil = event.params.freezedUntil
  entity.booster = event.params.booster

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleNewVestingPosition(event: NewVestingPositionEvent): void {
  let entity = new NewVestingPosition(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.position_totalVestedAmount = event.params.position.totalVestedAmount
  entity.position_releasedAmount = event.params.position.releasedAmount
  entity.position_cliffTimestamp = event.params.position.cliffTimestamp
  entity.position_vestingDuration = event.params.position.vestingDuration
  entity.position_freezingPeriod = event.params.position.freezingPeriod
  entity.position_booster = event.params.position.booster
  entity.position_nerfParameter = event.params.position.nerfParameter
  entity.index = event.params.index

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferCanceled(
  event: OwnershipTransferCanceledEvent,
): void {
  let entity = new OwnershipTransferCanceled(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.from = event.params.from
  entity.to = event.params.to

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferRequested(
  event: OwnershipTransferRequestedEvent,
): void {
  let entity = new OwnershipTransferRequested(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.from = event.params.from
  entity.to = event.params.to

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent,
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.from = event.params.from
  entity.to = event.params.to

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleSetFee(event: SetFeeEvent): void {
  let entity = new SetFee(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.fee = event.params.fee

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleSetMaxBooster(event: SetMaxBoosterEvent): void {
  let entity = new SetMaxBooster(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.maxBooster = event.params.maxBooster

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleStaked(event: StakedEvent): void {
  let entity = new Staked(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.user = event.params.user
  entity.tokenId = event.params.tokenId
  entity.amount = event.params.amount
  entity.freezedUntil = event.params.freezedUntil
  entity.vestingDuration = event.params.vestingDuration
  entity.booster = event.params.booster
  entity.nerfParameter = event.params.nerfParameter

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.from = event.params.from
  entity.to = event.params.to
  entity.tokenId = event.params.tokenId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleUnstake(event: UnstakeEvent): void {
  let entity = new Unstake(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  )
  entity.tokenId = event.params.tokenId
  entity.amount = event.params.amount
  entity.totalStaked = event.params.totalStaked
  entity.booster = event.params.booster

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
