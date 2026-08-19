import type { DiagnosticSink, FaultReporter, PluginDiagnostics } from '@cflow/diagnostics';

import type { BoundServices, ServiceBindings, ServiceTokenBase } from './service-token';

export type Awaitable<T> = T | PromiseLike<T>;

export type OwnedResourceDisposer = () => Awaitable<void>;

export interface PluginContext<Requires extends ServiceBindings = {}> {
  readonly diagnostics: PluginDiagnostics;
  readonly signal: AbortSignal;
  readonly services: BoundServices<Requires>;
  own(dispose: OwnedResourceDisposer): void;
  install<Config, ChildRequires extends ServiceBindings, ChildProvides extends ServiceBindings>(
    plugin: Plugin<Config, ChildRequires, ChildProvides>,
    ...args: InstallArguments<Config>
  ): PluginInstallation;
}

export type ProvidedServices<Provides extends ServiceBindings> = keyof Provides extends never
  ? void
  : BoundServices<Provides>;

export interface PluginDefinition<
  Config = void,
  Requires extends ServiceBindings = {},
  Provides extends ServiceBindings = {},
> {
  readonly name?: string;
  readonly requires?: Requires;
  readonly provides?: Provides;
  readonly setup: (context: PluginContext<Requires>, config: Config) => Awaitable<NoInfer<ProvidedServices<Provides>>>;
}

declare const pluginConfig: unique symbol;

export interface Plugin<Config = void, Requires extends ServiceBindings = {}, Provides extends ServiceBindings = {}> {
  readonly name?: string;
  readonly requires: Readonly<Requires>;
  readonly provides: Readonly<Provides>;
  // Keep Config invariant so callers cannot erase required configuration by
  // assigning a Plugin to a wider generic type.
  readonly [pluginConfig]: (config: Config) => Config;
}

export interface PendingInstallationSnapshot {
  readonly status: 'pending';
  readonly missing: readonly ServiceTokenBase[];
}

export interface ActiveInstallationSnapshot {
  readonly status: 'active';
}

export interface FailedInstallationSnapshot {
  readonly status: 'failed';
  readonly error: unknown;
}

export interface DisposedInstallationSnapshot {
  readonly status: 'disposed';
}

export type InstallationSnapshot =
  PendingInstallationSnapshot | ActiveInstallationSnapshot | FailedInstallationSnapshot | DisposedInstallationSnapshot;

export interface PluginInstallation {
  getSnapshot(): InstallationSnapshot;
  subscribe(listener: () => void): () => void;
  whenActive(signal?: AbortSignal): Promise<void>;
  dispose(): Promise<void>;
}

export type InstallArguments<Config> = undefined extends Config ? [config?: Config] : [config: Config];

export interface PluginHostDiagnosticsOptions {
  readonly hostId?: string;
  readonly sink?: DiagnosticSink;
  readonly faultReporter?: FaultReporter;
}

export interface PluginHostOptions {
  readonly diagnostics?: PluginHostDiagnosticsOptions;
}

export interface PluginHost {
  install<Config, Requires extends ServiceBindings, Provides extends ServiceBindings>(
    plugin: Plugin<Config, Requires, Provides>,
    ...args: InstallArguments<Config>
  ): PluginInstallation;
  dispose(): Promise<void>;
}
