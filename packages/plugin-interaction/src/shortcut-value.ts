import type { InteractionKeyboardShortcut } from './shortcut-contracts';
import { InteractionError } from './interaction-error';

export function defineInteractionShortcut(shortcut: InteractionKeyboardShortcut): InteractionKeyboardShortcut {
  if (typeof shortcut !== 'object' || shortcut === null) {
    throw new InteractionError('INVALID_SHORTCUT', 'Interaction Keyboard Shortcut is malformed.');
  }
  const code = shortcut.code;
  if (typeof code !== 'string' || code.length === 0) {
    throw new InteractionError('INVALID_SHORTCUT', 'Interaction Keyboard Shortcut is malformed.');
  }
  const modifierAlternatives = shortcut.modifierAlternatives;
  if (!Array.isArray(modifierAlternatives) || modifierAlternatives.length === 0) {
    throw new InteractionError('INVALID_SHORTCUT', 'Interaction Keyboard Shortcut is malformed.');
  }
  const alternatives = modifierAlternatives.map((value) => {
    if (typeof value !== 'object' || value === null) {
      throw new InteractionError('INVALID_SHORTCUT', 'Shortcut modifiers are malformed.');
    }
    const accepted = { alt: false, control: false, meta: false, shift: false };
    for (const field of ['alt', 'control', 'meta', 'shift'] as const) {
      const flag = value[field];
      if (typeof flag !== 'boolean') {
        throw new InteractionError('INVALID_SHORTCUT', 'Shortcut modifiers are malformed.');
      }
      accepted[field] = flag;
    }
    return Object.freeze(accepted);
  });
  return Object.freeze({ code, modifierAlternatives: Object.freeze(alternatives) });
}
