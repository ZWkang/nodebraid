import { CFlowError, type DiagnosticAttributes } from '@cflow/diagnostics';

export type RendererPluginErrorCode = 'SERVICE_DISPOSED';

export class RendererPluginError extends CFlowError<'plugin.renderer', RendererPluginErrorCode> {
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
