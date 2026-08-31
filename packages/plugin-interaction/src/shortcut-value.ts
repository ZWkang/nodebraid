import type { InteractionKeyboardShortcut } from './shortcut-contracts';
import { InteractionError } from './interaction-error';

export function defineInteractionShortcut(shortcut: InteractionKeyboardShortcut): InteractionKeyboardShortcut {
  if (
    typeof shortcut !== 'object' ||
    shortcut === null ||
    typeof shortcut.code !== 'string' ||
    shortcut.code.length === 0 ||
    !Array.isArray(shortcut.modifierAlternatives) ||
    shortcut.modifierAlternatives.length === 0
  ) {
    throw new InteractionError('INVALID_SHORTCUT', 'Interaction Keyboard Shortcut is malformed.');
  }
  const alternatives = shortcut.modifierAlternatives.map((value) => {
    if (
      typeof value !== 'object' ||
      value === null ||
      typeof value.alt !== 'boolean' ||
      typeof value.control !== 'boolean' ||
      typeof value.meta !== 'boolean' ||
      typeof value.shift !== 'boolean'
    ) {
      throw new InteractionError('INVALID_SHORTCUT', 'Shortcut modifiers are malformed.');
    }
    return Object.freeze({ alt: value.alt, control: value.control, meta: value.meta, shift: value.shift });
  });
  return Object.freeze({ code: shortcut.code, modifierAlternatives: Object.freeze(alternatives) });
}
