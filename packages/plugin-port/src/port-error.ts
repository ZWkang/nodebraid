import { NodeBraidError } from '@nodebraid/diagnostics';

export type PortErrorCode =
  | 'INVALID_CONTRIBUTION'
  | 'CONTRIBUTION_ALREADY_REGISTERED'
  | 'INVALID_PORT_DEFINITION'
  | 'PORT_ALREADY_DEFINED'
  | 'SERVICE_DISPOSED';

export class PortError extends NodeBraidError<'plugin.port', PortErrorCode> {
  override readonly name = 'PortError';

  constructor(
    code: PortErrorCode,
    message: string,
    details: Readonly<Record<string, string | number | boolean | null>> = {},
    options?: Readonly<{ cause?: unknown }>,
  ) {
    super('plugin.port', code, message, { details, cause: options?.cause });
  }
}
