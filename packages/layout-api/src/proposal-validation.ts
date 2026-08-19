import type { LayoutInput, LayoutPosition, LayoutProposal } from './contracts';
import { LayoutError } from './layout-error';
import { freezeLayoutProposal } from './owned-values';

export function validateLayoutProposal(input: LayoutInput, proposal: LayoutProposal): LayoutProposal {
  if (proposal.sourceRevision !== input.revision) {
    throwInvalidProposal('SOURCE_REVISION_MISMATCH', 'Layout Proposal does not match its Layout Input revision.', {
      expectedRevision: input.revision,
      sourceRevision: proposal.sourceRevision,
    });
  }
  const inputNodes = new Map(input.nodes.map((node) => [node.id, node]));
  const seenNodeIds = new Set<LayoutPosition['id']>();
  for (const result of proposal.positions) {
    if (seenNodeIds.has(result.id)) {
      throwInvalidProposal('DUPLICATE_NODE', `Layout Proposal contains Node "${result.id}" more than once.`, {
        nodeId: result.id,
      });
    }
    const inputNode = inputNodes.get(result.id);
    if (!inputNode) {
      throwInvalidProposal('UNKNOWN_NODE', `Layout Proposal contains unknown Node "${result.id}".`, {
        nodeId: result.id,
      });
    }
    seenNodeIds.add(result.id);
    for (const coordinate of ['x', 'y'] as const) {
      const value = result.position[coordinate];
      if (!Number.isFinite(value)) {
        throwInvalidProposal('INVALID_POSITION', `Layout Proposal contains an invalid ${coordinate} coordinate.`, {
          nodeId: result.id,
          coordinate,
          value,
        });
      }
    }
    if (inputNode.fixed && (result.position.x !== inputNode.position.x || result.position.y !== inputNode.position.y)) {
      throwInvalidProposal('FIXED_NODE_MOVED', `Layout Proposal moves Fixed Node "${result.id}".`, {
        nodeId: result.id,
        expected: Object.freeze({ ...inputNode.position }),
        actual: Object.freeze({ ...result.position }),
      });
    }
  }
  for (const inputNode of input.nodes) {
    if (!seenNodeIds.has(inputNode.id)) {
      throwInvalidProposal('MISSING_NODE', `Layout Proposal is missing Node "${inputNode.id}".`, {
        nodeId: inputNode.id,
      });
    }
  }
  const sortedProposal: LayoutProposal = {
    sourceRevision: proposal.sourceRevision,
    positions: [...proposal.positions].sort((left, right) => compareIds(left.id, right.id)),
  };
  return freezeLayoutProposal(sortedProposal);
}

function throwInvalidProposal(issue: string, message: string, details: Readonly<Record<string, unknown>>): never {
  throw new LayoutError('INVALID_PROPOSAL', message, Object.freeze({ issue, ...details }));
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
