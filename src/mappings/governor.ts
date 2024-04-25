import { GovernanceProposal, GovernanceVote } from '../types/schema';
import { ProposalCreated, ProposalExecuted, VoteCastWithParams } from '../types/templates/JellyGovernor/JellyGovernor';
import { Address, BigInt } from '@graphprotocol/graph-ts';
import { log } from '@graphprotocol/graph-ts'

export function handleProposalCreated(event: ProposalCreated): void {
  let proposalId = event.params.proposalId;

  let proposal = new GovernanceProposal(proposalId.toHexString());
  proposal.proposer = event.params.proposer;
  proposal.values = event.params.values;
  proposal.calldatas = event.params.calldatas;
  proposal.description = event.params.description;
  proposal.voteStart = event.params.voteStart;
  proposal.voteEnd = event.params.voteEnd;
  proposal.executed = false;
  proposal.voteAbstain = BigInt.fromString('0');
  proposal.voteAgainst = BigInt.fromString('0');
  proposal.voteFor = BigInt.fromString('0');
  let targets: string[] = [];
  for (let i = 0; i < event.params.targets.length; i++) {
    log.info('------------------TARGET LOOOP ------------ {}', [event.params.targets[i].toHexString()]);
    let target = event.params.targets[i].toHexString();
    log.info('------------------TARGET LOOOP2 ------------ {}', [target]);
    targets.push(target);
    // log.info('------------------TARGET LOOOP3 ------------ {}', [proposal.targets[i]]);
  }
  proposal.targets = targets;
  proposal.save();
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let proposalId = event.params.proposalId;

  let proposal = GovernanceProposal.load(proposalId.toHexString());
  if (proposal == null) {
    return;
  }

  proposal.executed = true;
  proposal.save();
}

export function handleVoteCast(event: VoteCastWithParams): void {
  let proposalId = event.params.proposalId;

  let proposal = GovernanceProposal.load(proposalId.toHexString());
  if (proposal == null) {
    return;
  }

  if (event.params.support == 0) {
    proposal.voteAgainst = proposal.voteAgainst.plus(event.params.weight);
  } else if (event.params.support == 1) {
    proposal.voteFor = proposal.voteFor.plus(event.params.weight);
  } else {
    proposal.voteAbstain = proposal.voteAbstain.plus(event.params.weight);
  }
  proposal.save();

  let vote = new GovernanceVote(event.transaction.hash.toHexString() + '-' + event.logIndex.toString());
  vote.proposal = proposalId.toHexString();
  vote.voter = event.params.voter;
  vote.support = BigInt.fromI32(event.params.support);
  vote.weight = event.params.weight;
  vote.save();
}
