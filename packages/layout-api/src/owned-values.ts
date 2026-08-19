import type { LayoutProposal } from './contracts';

export function freezeLayoutProposal(proposal: LayoutProposal): LayoutProposal {
  const positions = proposal.positions.map((position) =>
    Object.freeze({
      id: position.id,
      position: Object.freeze({ ...position.position }),
    }),
  );
  return Object.freeze({
    sourceRevision: proposal.sourceRevision,
    positions: Object.freeze(positions),
  });
}
