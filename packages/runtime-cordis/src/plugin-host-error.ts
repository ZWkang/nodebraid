import { CFlowError, type DiagnosticAttributes } from '@cflow/diagnostics';

export type PluginHostErrorCode =
  | 'HOST_DISPOSED'
  | 'INSTALLATION_DISPOSED'
  | 'CONTRACT_VIOLATION'
  | 'PROVIDER_CONFLICT'
  | 'DEPENDENCY_CYCLE'
  | 'INVALID_DEFINITION';

export interface ProviderConflictErrorDetails extends DiagnosticAttributes {
  readonly type: 'provider-conflict';
  readonly serviceName: string;
  readonly existingProvider: string;
  readonly conflictingProvider: string;
}

export interface DependencyCyclePathSegment extends DiagnosticAttributes {
  readonly plugin: string;
  readonly serviceName: string;
  readonly provider: string;
}

export interface DependencyCycleErrorDetails extends DiagnosticAttributes {
  readonly type: 'dependency-cycle';
  readonly path: readonly DependencyCyclePathSegment[];
}

export type PluginHostErrorDetails = ProviderConflictErrorDetails | DependencyCycleErrorDetails;

export class PluginHostError extends CFlowError<'runtime.plugin-host', PluginHostErrorCode, PluginHostErrorDetails> {
  override readonly name = 'PluginHostError';

  constructor(
    code: PluginHostErrorCode,
    message: string,
    details: PluginHostErrorDetails = {} as PluginHostErrorDetails,
    options?: Readonly<{ cause?: unknown }>,
  ) {
    super('runtime.plugin-host', code, message, {
      details,
      cause: options?.cause,
    });
  }
}
