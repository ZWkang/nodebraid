export type {
  CreateDuplicateSelectionPluginOptions,
  CreateDuplicateSelectionShortcutPluginOptions,
  DuplicateEdgeIdMapping,
  DuplicateIdMaterialization,
  DuplicateIdMaterializationInput,
  DuplicateIdMaterializer,
  DuplicateNodeIdMapping,
  DuplicateSelectionResult,
} from './contracts';
export { duplicateSelectionCommand } from './duplicate-selection-command';
export { DuplicateSelectionError, type DuplicateSelectionErrorCode } from './duplicate-selection-error';
export { createDuplicateSelectionPlugin } from './duplicate-selection-plugin';
export { createDuplicateSelectionShortcutPlugin } from './duplicate-selection-shortcut-plugin';
