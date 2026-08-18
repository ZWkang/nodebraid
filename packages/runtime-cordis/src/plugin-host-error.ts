import type { ServiceTokenBase } from './service-token';

export type PluginHostErrorCode =
  | 'HOST_DISPOSED'
  | 'INSTALLATION_DISPOSED'
  | 'CONTRACT_VIOLATION'
  | 'PROVIDER_CONFLICT'
  | 'DEPENDENCY_CYCLE'
  | 'INVALID_DEFINITION';

export interface ProviderConflictErrorDetails {
  readonly type: 'provider-conflict';
  readonly token: ServiceTokenBase;
  readonly existingProvider: string;
  readonly conflictingProvider: string;
}

export interface DependencyCyclePathSegment {
  readonly plugin: string;
  readonly service: ServiceTokenBase;
  readonly provider: string;
}

export interface DependencyCycleErrorDetails {
  readonly type: 'dependency-cycle';
  readonly path: readonly DependencyCyclePathSegment[];
}

export type PluginHostErrorDetails = ProviderConflictErrorDetails | DependencyCycleErrorDetails;

export class PluginHostError extends Error {
  override readonly name = 'PluginHostError';

  constructor(
    readonly code: PluginHostErrorCode,
    message: string,
    readonly details?: PluginHostErrorDetails,
  ) {
    super(message);
  }
}
