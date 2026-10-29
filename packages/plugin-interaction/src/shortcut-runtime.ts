import type { PluginDiagnostics } from '@nodebraid/diagnostics';
import { CommandError, type CommandService } from '@nodebraid/plugin-command';
import type { InputDisposition, KeyboardInput } from '@nodebraid/renderer-api';

import { interactionDiagnosticEvents } from './diagnostic-events';
import { InteractionError } from './interaction-error';
import type {
  InteractionShortcutBinding,
  InteractionShortcutRegistration,
  InteractionShortcutService,
} from './shortcut-contracts';
import { defineInteractionShortcut } from './shortcut-value';

interface RunningShortcut {
  readonly controller: AbortController;
  readonly settled: Promise<void>;
}

interface ShortcutEntry {
  readonly binding: InteractionShortcutBinding;
  readonly keys: ReadonlySet<string>;
  readonly executions: Set<RunningShortcut>;
  disposePromise?: Promise<void>;
}

const preventDefaultDisposition = Object.freeze({ defaultAction: 'prevent' as const });

export function createShortcutRuntime(options: {
  readonly commands: CommandService;
  readonly diagnostics: PluginDiagnostics;
  readonly getActiveGestureType: () => string | undefined;
}): {
  readonly service: InteractionShortcutService;
  readonly decideDisposition: (input: KeyboardInput) => InputDisposition | undefined;
  readonly handleInput: (input: KeyboardInput) => InputDisposition | undefined;
  readonly dispose: () => Promise<void>;
} {
  const entries = new Set<ShortcutEntry>();
  const entriesByKey = new Map<string, ShortcutEntry>();
  let disposed = false;

  const disposeEntry = (entry: ShortcutEntry): Promise<void> => {
    if (entry.disposePromise) return entry.disposePromise;
    let completeDisposal!: () => void;
    entry.disposePromise = new Promise<void>((resolve) => {
      completeDisposal = resolve;
    });
    for (const execution of entry.executions) execution.controller.abort();
    void Promise.all([...entry.executions].map((execution) => execution.settled)).then(() => {
      for (const key of entry.keys) {
        if (entriesByKey.get(key) === entry) entriesByKey.delete(key);
      }
      entries.delete(entry);
      completeDisposal();
    });
    return entry.disposePromise;
  };

  const service: InteractionShortcutService = Object.freeze({
    register<Output>(binding: InteractionShortcutBinding<Output>): InteractionShortcutRegistration {
      if (disposed) throw new InteractionError('SHORTCUT_DISPOSED', 'Interaction Shortcut Service is disposed.');
      const accepted = acceptBinding(binding);
      const keys = new Set(
        accepted.shortcut.modifierAlternatives.map((modifiers) => bindingKey(accepted.shortcut.code, modifiers)),
      );
      for (const key of keys) {
        if (entriesByKey.has(key)) {
          throw new InteractionError(
            'SHORTCUT_ALREADY_REGISTERED',
            'Interaction Shortcut Binding is already registered.',
          );
        }
      }
      const entry: ShortcutEntry = {
        binding: accepted as InteractionShortcutBinding,
        keys,
        executions: new Set(),
      };
      entries.add(entry);
      for (const key of keys) entriesByKey.set(key, entry);
      return Object.freeze({ dispose: () => disposeEntry(entry) });
    },
  });

  const handleInput = (input: KeyboardInput): InputDisposition | undefined => {
    if (disposed || input.type !== 'key.down') return undefined;
    const entry = entriesByKey.get(bindingKey(input.code, input.modifiers));
    if (!entry) return undefined;
    if (entry.disposePromise) return preventDefaultDisposition;
    const gestureType = options.getActiveGestureType();
    if (input.repeat || gestureType) {
      options.diagnostics.emit({
        name: interactionDiagnosticEvents.inputRejected,
        level: 'info',
        attributes: {
          inputType: input.type,
          ...(gestureType ? { gestureType } : {}),
          reason: input.repeat ? 'repeat' : 'active-gesture',
        },
      });
      return preventDefaultDisposition;
    }
    execute(entry);
    return preventDefaultDisposition;
  };

  const decideDisposition = (input: KeyboardInput): InputDisposition | undefined => {
    if (disposed || input.type !== 'key.down') return undefined;
    return entriesByKey.has(bindingKey(input.code, input.modifiers)) ? preventDefaultDisposition : undefined;
  };

  const execute = (entry: ShortcutEntry): void => {
    const controller = new AbortController();
    let complete!: () => void;
    const settled = new Promise<void>((resolve) => {
      complete = resolve;
    });
    const running: RunningShortcut = { controller, settled };
    entry.executions.add(running);
    void options.commands.execute(entry.binding.command, undefined, { signal: controller.signal }).then(
      () => finish(),
      (error: unknown) => {
        try {
          const expectedDisposalAbort =
            entry.disposePromise !== undefined && controller.signal.aborted && error === controller.signal.reason;
          if (!expectedDisposalAbort) {
            let unavailable = false;
            let rejection = error;
            try {
              unavailable = error instanceof CommandError && error.code === 'COMMAND_NOT_FOUND';
            } catch (inspectionFailure) {
              rejection = new AggregateError(
                [error, inspectionFailure],
                'Shortcut Command rejection inspection failed.',
              );
            }
            if (unavailable) {
              options.diagnostics.emit({
                name: interactionDiagnosticEvents.inputRejected,
                level: 'info',
                attributes: { inputType: 'key.down', reason: 'capability-unavailable' },
              });
            } else {
              options.diagnostics.reportFault(rejection, {
                name: interactionDiagnosticEvents.commandFault,
                attributes: { commandId: entry.binding.command.id },
              });
            }
          }
        } finally {
          finish();
        }
      },
    );

    function finish(): void {
      entry.executions.delete(running);
      complete();
    }
  };

  return {
    service,
    decideDisposition,
    handleInput,
    async dispose() {
      disposed = true;
      await Promise.all([...entries].map(disposeEntry));
    },
  };
}

function acceptBinding<Output>(binding: InteractionShortcutBinding<Output>): InteractionShortcutBinding<Output> {
  if (typeof binding !== 'object' || binding === null) {
    throw new InteractionError('INVALID_SHORTCUT', 'Interaction Shortcut Binding is malformed.');
  }
  const command = binding.command;
  if (typeof command !== 'object' || command === null) {
    throw new InteractionError('INVALID_SHORTCUT', 'Interaction Shortcut Binding is malformed.');
  }
  const shortcut = defineInteractionShortcut(binding.shortcut);
  return Object.freeze({ shortcut, command });
}

function bindingKey(code: string, modifiers: KeyboardInput['modifiers']): string {
  return `${code}\u0000${Number(modifiers.alt)}${Number(modifiers.control)}${Number(modifiers.meta)}${Number(modifiers.shift)}`;
}
