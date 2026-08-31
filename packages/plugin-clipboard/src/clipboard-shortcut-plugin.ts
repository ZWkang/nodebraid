import {
  defineInteractionShortcut,
  InteractionError,
  interactionShortcutService,
  type InteractionKeyboardShortcut,
} from '@nodebraid/plugin-interaction';
import { definePlugin } from '@nodebraid/runtime-cordis';

import { copySelectionToClipboardCommand, pasteClipboardCommand } from './clipboard-commands';
import { ClipboardError } from './clipboard-error';
import type { CreateClipboardShortcutPluginOptions } from './contracts';

const defaultCopyShortcut: InteractionKeyboardShortcut = defineInteractionShortcut({
  code: 'KeyC',
  modifierAlternatives: [
    { alt: false, control: true, meta: false, shift: false },
    { alt: false, control: false, meta: true, shift: false },
  ],
});

const defaultPasteShortcut: InteractionKeyboardShortcut = defineInteractionShortcut({
  code: 'KeyV',
  modifierAlternatives: [
    { alt: false, control: true, meta: false, shift: false },
    { alt: false, control: false, meta: true, shift: false },
  ],
});

export function createClipboardShortcutPlugin(options: CreateClipboardShortcutPluginOptions = {}) {
  const accepted = acceptOptions(options);
  return definePlugin({
    name: '@nodebraid/plugin-clipboard:shortcut',
    requires: { shortcuts: interactionShortcutService },
    setup(context) {
      const copyRegistration = context.services.shortcuts.register({
        shortcut: accepted.copyShortcut,
        command: copySelectionToClipboardCommand,
      });
      context.own(() => copyRegistration.dispose());
      const pasteRegistration = context.services.shortcuts.register({
        shortcut: accepted.pasteShortcut,
        command: pasteClipboardCommand,
      });
      context.own(() => pasteRegistration.dispose());
    },
  });
}

function acceptOptions(
  options: CreateClipboardShortcutPluginOptions,
): Readonly<Required<CreateClipboardShortcutPluginOptions>> {
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new ClipboardError('INVALID_CONFIG', 'Clipboard Shortcut options must be an object.');
  }
  for (const key of Reflect.ownKeys(options)) {
    if (key !== 'copyShortcut' && key !== 'pasteShortcut') {
      throw new ClipboardError('INVALID_CONFIG', 'Clipboard Shortcut options contain an unknown field.');
    }
  }
  return Object.freeze({
    copyShortcut: acceptShortcut(options.copyShortcut, defaultCopyShortcut, 'Copy'),
    pasteShortcut: acceptShortcut(options.pasteShortcut, defaultPasteShortcut, 'Paste'),
  });
}

function acceptShortcut(
  value: InteractionKeyboardShortcut | undefined,
  fallback: InteractionKeyboardShortcut,
  operation: string,
): InteractionKeyboardShortcut {
  if (value === undefined) return fallback;
  try {
    return defineInteractionShortcut(value);
  } catch (error) {
    if (error instanceof InteractionError && error.code === 'INVALID_SHORTCUT') {
      throw new ClipboardError(
        'INVALID_CONFIG',
        `Clipboard ${operation} Shortcut is malformed.`,
        {},
        {
          cause: error,
        },
      );
    }
    throw error;
  }
}
