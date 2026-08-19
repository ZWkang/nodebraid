import type { Command } from './contracts';
import { CommandError } from './command-error';

const commandIds = new WeakMap<object, string>();

export function defineCommand<Input = void, Output = void>(id: string): Command<Input, Output> {
  if (typeof id !== 'string') {
    throw new CommandError(
      'INVALID_COMMAND',
      'Command ID must be a non-empty string.',
      Object.freeze({ receivedType: id === null ? 'null' : typeof id }),
    );
  }
  if (id.length === 0) {
    throw new CommandError(
      'INVALID_COMMAND',
      'Command ID must be a non-empty string.',
      Object.freeze({ commandId: id }),
    );
  }
  const command = Object.freeze({ id }) as Command<Input, Output>;
  commandIds.set(command, id);
  return command;
}

export function getCommandId(command: unknown): string {
  const commandId = typeof command === 'object' && command !== null ? commandIds.get(command) : undefined;
  if (commandId === undefined) {
    throw new CommandError('INVALID_COMMAND', 'Command must be created with defineCommand().');
  }
  return commandId;
}
