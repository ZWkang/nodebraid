import type { InstallArguments, OwnedResourceDisposer, Plugin, PluginInstallation } from './plugin-contracts';
import type { ServiceBindings } from './service-token';

export type ChildInstaller = <Config, Requires extends ServiceBindings, Provides extends ServiceBindings>(
  plugin: Plugin<Config, Requires, Provides>,
  ...args: InstallArguments<Config>
) => PluginInstallation;

export type ServicePublisher = (name: string, value: unknown) => OwnedResourceDisposer;

export type DependencyCleanupReporter = (serviceName: string, error: unknown) => void;

export interface RuntimeContext {
  get(name: string): unknown;
  on(event: 'internal/service', listener: (name: string) => void): unknown;
}

export type RuntimeFiber = {
  dispose(): Promise<void>;
} & PromiseLike<unknown>;
