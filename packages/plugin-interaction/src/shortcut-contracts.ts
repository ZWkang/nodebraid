import type { Command } from '@nodebraid/plugin-command';
import type { InputModifiers } from '@nodebraid/renderer-api';

export interface InteractionKeyboardShortcut {
  readonly code: string;
  readonly modifierAlternatives: readonly InputModifiers[];
}

export interface InteractionShortcutBinding<Output = unknown> {
  readonly shortcut: InteractionKeyboardShortcut;
  readonly command: Command<void, Output>;
}

export interface InteractionShortcutRegistration {
  dispose(): Promise<void>;
}

export interface InteractionShortcutService {
  register<Output>(binding: InteractionShortcutBinding<Output>): InteractionShortcutRegistration;
}
