import {
  updateNodeDataCommand,
  type CanvasNode,
  type CanvasView,
  type CommandService,
  type KernelService,
  type NodeId,
  type SelectionSnapshot,
} from '@nodebraid/core';

import { acceptExampleData } from './example-data-codec';

export interface NodeDraft {
  readonly expectedNode: CanvasNode;
  readonly label: string;
  readonly tags: string;
}

export interface NodeEditorProjection {
  readonly selected: CanvasNode | undefined;
  readonly current: CanvasNode | undefined;
  readonly dirty: boolean;
  readonly switching: boolean;
  readonly stale: boolean;
  readonly afterApplyNodeId: NodeId | undefined;
}

export function projectNodeEditor(
  view: CanvasView,
  selection: SelectionSnapshot,
  draft: NodeDraft | undefined,
): NodeEditorProjection {
  const selected =
    selection.nodeIds.length === 1 && selection.edgeIds.length === 0
      ? view.query.getNode(selection.nodeIds[0]!)
      : undefined;
  const dirty = draft !== undefined && isNodeDraftDirty(draft);
  const switching = dirty && draft.expectedNode.id !== selected?.id;
  const current = draft ? view.query.getNode(draft.expectedNode.id) : undefined;
  return {
    selected,
    current,
    dirty,
    switching,
    stale: dirty && current !== draft.expectedNode,
    afterApplyNodeId: switching ? selected?.id : draft?.expectedNode.id,
  };
}

export function createNodeDraft(expectedNode: CanvasNode): NodeDraft {
  const data = acceptExampleData(expectedNode.data);
  return { expectedNode, label: data?.label ?? '', tags: JSON.stringify(data?.tags ?? []) };
}

export function reconcileNodeDraft(
  draft: NodeDraft | undefined,
  selected: CanvasNode | undefined,
): NodeDraft | undefined {
  if (draft && isNodeDraftDirty(draft)) return draft;
  if (draft?.expectedNode === selected) return draft;
  return selected ? createNodeDraft(selected) : undefined;
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

export async function applyNodeDraft(
  services: Readonly<{ kernel: KernelService; commands: CommandService }>,
  draft: NodeDraft,
  afterApplyNodeId: NodeId | undefined,
): Promise<NodeDraft | undefined> {
  await services.commands.execute(updateNodeDataCommand, {
    expectedNode: draft.expectedNode,
    data: materializeNodeDraft(draft),
  });
  const next = afterApplyNodeId ? services.kernel.read().query.getNode(afterApplyNodeId) : undefined;
  return next ? createNodeDraft(next) : undefined;
}
