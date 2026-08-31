import type { CanvasCommit, EdgeId, NodeId, Point } from '@nodebraid/kernel';
import type { InteractionKeyboardShortcut } from '@nodebraid/plugin-interaction';

export interface DuplicateIdMaterializationInput {
  readonly nodeIds: readonly NodeId[];
  readonly edgeIds: readonly EdgeId[];
}

export interface DuplicateNodeIdMapping {
  readonly sourceId: NodeId;
  readonly duplicateId: NodeId;
}

export interface DuplicateEdgeIdMapping {
  readonly sourceId: EdgeId;
  readonly duplicateId: EdgeId;
}

export interface DuplicateIdMaterialization {
  readonly nodes: readonly DuplicateNodeIdMapping[];
  readonly edges: readonly DuplicateEdgeIdMapping[];
}

export type DuplicateIdMaterializer = (input: DuplicateIdMaterializationInput) => DuplicateIdMaterialization;

export interface CreateDuplicateSelectionPluginOptions {
  readonly materializeIds: DuplicateIdMaterializer;
  readonly offset?: Point;
}

export interface CreateDuplicateSelectionShortcutPluginOptions {
  readonly shortcut?: InteractionKeyboardShortcut;
}

export type DuplicateSelectionResult = CanvasCommit | null;
