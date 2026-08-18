export type KernelPluginErrorCode = 'SERVICE_DISPOSED';

export class KernelPluginError extends Error {
  readonly code: KernelPluginErrorCode;

  constructor(code: KernelPluginErrorCode, message: string) {
    super(message);
    this.name = 'KernelPluginError';
    this.code = code;
  }
}
