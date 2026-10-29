import type { CanvasNode } from '@nodebraid/core';

import { acceptExampleData } from './example-data-codec';

export interface NodeDraft {
  readonly expectedNode: CanvasNode;
  readonly label: string;
  readonly tags: string;
}

export function createNodeDraft(expectedNode: CanvasNode): NodeDraft {
  const data = acceptExampleData(expectedNode.data);
  return { expectedNode, label: data?.label ?? '', tags: JSON.stringify(data?.tags ?? []) };
}

export function isNodeDraftDirty(draft: NodeDraft): boolean {
  const initial = createNodeDraft(draft.expectedNode);
  return draft.label !== initial.label || draft.tags !== initial.tags;
}

export function materializeNodeDraft(draft: NodeDraft): unknown {
  if (!isNodeDraftDirty(draft)) return draft.expectedNode.data;
  const next = acceptExampleData({ label: draft.label, tags: JSON.parse(draft.tags) });
  const previous = acceptExampleData(draft.expectedNode.data);
  if (
    previous !== null &&
    next !== null &&
    previous.label === next.label &&
    previous.tags.length === next.tags.length &&
    previous.tags.every((tag, index) => tag === next.tags[index])
  ) {
    return draft.expectedNode.data;
  }
  return next;
}
