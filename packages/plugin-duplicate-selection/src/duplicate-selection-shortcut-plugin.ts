import {
  defineInteractionShortcut,
  InteractionError,
  interactionShortcutService,
  type InteractionKeyboardShortcut,
} from '@nodebraid/plugin-interaction';
import { definePlugin } from '@nodebraid/runtime-cordis';

import type { CreateDuplicateSelectionShortcutPluginOptions } from './contracts';
import { duplicateSelectionCommand } from './duplicate-selection-command';
import { DuplicateSelectionError } from './duplicate-selection-error';

const defaultShortcut: InteractionKeyboardShortcut = defineInteractionShortcut({
  code: 'KeyD',
  modifierAlternatives: [
    { alt: false, control: true, meta: false, shift: false },
    { alt: false, control: false, meta: true, shift: false },
  ],
});

export function createDuplicateSelectionShortcutPlugin(options: CreateDuplicateSelectionShortcutPluginOptions = {}) {
  const shortcut = acceptOptions(options);
  return definePlugin({
    name: '@nodebraid/plugin-duplicate-selection:shortcut',
    requires: { shortcuts: interactionShortcutService },
    setup(context) {
      const registration = context.services.shortcuts.register({ shortcut, command: duplicateSelectionCommand });
      context.own(() => registration.dispose());
    },
  });
}

function acceptOptions(options: CreateDuplicateSelectionShortcutPluginOptions): InteractionKeyboardShortcut {
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new DuplicateSelectionError('INVALID_CONFIG', 'Duplicate Selection Shortcut options must be an object.');
  }
  for (const key of Reflect.ownKeys(options)) {
    if (key !== 'shortcut') {
      throw new DuplicateSelectionError(
        'INVALID_CONFIG',
        'Duplicate Selection Shortcut options contain an unknown field.',
      );
    }
  }
  const shortcut = options.shortcut;
  if (shortcut === undefined) return defaultShortcut;
  try {
    return defineInteractionShortcut(shortcut);
  } catch (error) {
    if (error instanceof InteractionError && error.code === 'INVALID_SHORTCUT') {
      throw new DuplicateSelectionError(
        'INVALID_CONFIG',
        'Duplicate Selection Shortcut is malformed.',
        {},
        { cause: error },
      );
    }
    throw error;
  }
}
