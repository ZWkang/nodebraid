import { NodeBraidError, type DiagnosticAttributes } from '@nodebraid/diagnostics';

export type CommandErrorCode =
  'INVALID_COMMAND' | 'COMMAND_ALREADY_REGISTERED' | 'COMMAND_NOT_FOUND' | 'SERVICE_DISPOSED';

export class CommandError extends NodeBraidError<'plugin.command', CommandErrorCode> {
  override readonly name = 'CommandError';

  constructor(
    code: CommandErrorCode,
    message: string,
    details: DiagnosticAttributes = {},
    options?: Readonly<{ cause?: unknown }>,
  ) {
    super('plugin.command', code, message, { details, cause: options?.cause });
  }
}
