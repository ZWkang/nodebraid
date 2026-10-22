import { describeNonFiniteNumber, type DiagnosticAttributes } from '@nodebraid/diagnostics';

import type { LayoutInput, LayoutPosition, LayoutProposal } from './contracts';
import { LayoutError } from './layout-error';
import { freezeLayoutProposal } from './owned-values';

export function validateLayoutProposal(input: LayoutInput, proposal: LayoutProposal): LayoutProposal {
  const sourceRevision = proposal.sourceRevision;
  if (sourceRevision !== input.revision) {
    throwInvalidProposal('SOURCE_REVISION_MISMATCH', 'Layout Proposal does not match its Layout Input revision.', {
      expectedRevision: input.revision,
      sourceRevision,
    });
  }
  const inputNodes = new Map(input.nodes.map((node) => [node.id, node]));
  const seenNodeIds = new Set<LayoutPosition['id']>();
  const positions: LayoutPosition[] = [];
  for (const result of proposal.positions) {
    const id = result.id;
    if (seenNodeIds.has(id)) {
      throwInvalidProposal('DUPLICATE_NODE', `Layout Proposal contains Node "${id}" more than once.`, {
        nodeId: id,
      });
    }
    const inputNode = inputNodes.get(id);
    if (!inputNode) {
      throwInvalidProposal('UNKNOWN_NODE', `Layout Proposal contains unknown Node "${id}".`, {
        nodeId: id,
      });
    }
    seenNodeIds.add(id);
    const receivedPosition = result.position;
    const position = {
      x: acceptCoordinate(receivedPosition.x, 'x', id),
      y: acceptCoordinate(receivedPosition.y, 'y', id),
    };
    if (inputNode.fixed && (position.x !== inputNode.position.x || position.y !== inputNode.position.y)) {
      throwInvalidProposal('FIXED_NODE_MOVED', `Layout Proposal moves Fixed Node "${id}".`, {
        nodeId: id,
        expected: Object.freeze({ ...inputNode.position }),
        actual: Object.freeze({ ...position }),
      });
    }
    positions.push({ id, position });
  }
  for (const inputNode of input.nodes) {
    if (!seenNodeIds.has(inputNode.id)) {
      throwInvalidProposal('MISSING_NODE', `Layout Proposal is missing Node "${inputNode.id}".`, {
        nodeId: inputNode.id,
      });
    }
  }
  const sortedProposal: LayoutProposal = {
    sourceRevision,
    positions: positions.sort((left, right) => compareIds(left.id, right.id)),
  };
  return freezeLayoutProposal(sortedProposal);
}

function acceptCoordinate(value: number, coordinate: 'x' | 'y', nodeId: LayoutPosition['id']): number {
  if (!Number.isFinite(value)) {
    throwInvalidProposal('INVALID_POSITION', `Layout Proposal contains an invalid ${coordinate} coordinate.`, {
      nodeId,
      coordinate,
      receivedNumber: describeNonFiniteNumber(value),
    });
  }
  return value;
}

function throwInvalidProposal(issue: string, message: string, details: DiagnosticAttributes): never {
  throw new LayoutError('INVALID_PROPOSAL', message, Object.freeze({ issue, ...details }));
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
