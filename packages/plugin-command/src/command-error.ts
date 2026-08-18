export type CommandErrorCode =
  'INVALID_COMMAND' | 'COMMAND_ALREADY_REGISTERED' | 'COMMAND_NOT_FOUND' | 'SERVICE_DISPOSED';

export class CommandError extends Error {
  override readonly name = 'CommandError';

  constructor(
    readonly code: CommandErrorCode,
    message: string,
    readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
  }
}
