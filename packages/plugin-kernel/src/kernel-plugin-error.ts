import { CFlowError } from '@cflow/diagnostics';

export type KernelPluginErrorCode = 'SERVICE_DISPOSED';

export class KernelPluginError extends CFlowError<'plugin.kernel', KernelPluginErrorCode> {
  override readonly name = 'KernelPluginError';

  constructor(code: KernelPluginErrorCode, message: string, options?: Readonly<{ cause?: unknown }>) {
    super('plugin.kernel', code, message, { cause: options?.cause });
  }
}
