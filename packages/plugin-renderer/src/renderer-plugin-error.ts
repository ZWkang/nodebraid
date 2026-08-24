import { NodeBraidError, type DiagnosticAttributes } from '@nodebraid/diagnostics';

export type RendererPluginErrorCode =
  'SERVICE_DISPOSED' | 'SYNC_FAILED' | 'INTERACTION_ALREADY_BOUND' | 'INTERACTION_BINDING_DISPOSED';

export class RendererPluginError extends NodeBraidError<'plugin.renderer', RendererPluginErrorCode> {
  override readonly name = 'RendererPluginError';

  constructor(
    code: RendererPluginErrorCode,
    message: string,
    details: DiagnosticAttributes = {},
    options?: Readonly<{ cause?: unknown }>,
  ) {
    super('plugin.renderer', code, message, { details, cause: options?.cause });
  }
}
