import { Context } from 'cordis';

import { collectCleanupError } from './cleanup-errors';
import type { DependencyCleanupReporter, RuntimeContext, ServicePublisher } from './internal-contracts';
import { getInternalPlugin, type InternalPlugin } from './plugin-definition';
import { PluginGraph } from './plugin-graph';
import { CordisPluginInstallation } from './plugin-installation';
import type {
  InstallArguments,
  OwnedResourceDisposer,
  Plugin,
  PluginDefinition,
  PluginHost,
  PluginInstallation,
} from './plugin-contracts';
import { PluginHostError } from './plugin-host-error';
import { getServiceName, type ServiceBindings } from './service-token';

interface CordisPluginCallback {
  (context: Context, installation: CordisPluginInstallation): Promise<OwnedResourceDisposer>;
  inject?: string[];
}

const cordisPlugins = new WeakMap<object, CordisPluginCallback>();

class CordisPluginHost implements PluginHost {
  readonly #context = new Context();
  readonly #dependencyCleanupErrors = new Map<string, unknown[]>();
  // Register values on the Host context so a Provider Fiber owns one composite
  // deactivation. That composite can withdraw Services strictly in reverse
  // order instead of letting Cordis dispose independent provide effects in parallel.
  readonly #publishService: ServicePublisher = (name, value) => {
    const withdraw = this.#context.provide(name, value);
    let disposal: Promise<void> | undefined;
    return () => {
      disposal ??= (async () => {
        const errors: unknown[] = [];
        try {
          await withdraw();
        } catch (error) {
          collectCleanupError(errors, error);
        }
        const dependencyErrors = this.#dependencyCleanupErrors.get(name);
        this.#dependencyCleanupErrors.delete(name);
        if (dependencyErrors) errors.push(...dependencyErrors);
        if (errors.length) {
          throw new AggregateError(errors, 'Required Service cleanup failed.');
        }
      })();
      return disposal;
    };
  };
  readonly #reportDependencyCleanupError: DependencyCleanupReporter = (serviceName, error) => {
    const errors = this.#dependencyCleanupErrors.get(serviceName) ?? [];
    collectCleanupError(errors, error);
    this.#dependencyCleanupErrors.set(serviceName, errors);
  };
  readonly #rootInstallations = new Set<PluginInstallation>();
  readonly #graph = new PluginGraph();
  #closed = false;
  #disposal?: Promise<void>;

  install<Config, Requires extends ServiceBindings, Provides extends ServiceBindings>(
    plugin: Plugin<Config, Requires, Provides>,
    ...args: InstallArguments<Config>
  ): PluginInstallation {
    return this.#install(plugin, args, true);
  }

  #install<Config, Requires extends ServiceBindings, Provides extends ServiceBindings>(
    plugin: Plugin<Config, Requires, Provides>,
    args: InstallArguments<Config>,
    isRoot: boolean,
  ): PluginInstallation {
    if (this.#closed) {
      throw new PluginHostError('HOST_DISPOSED', 'Plugin Host is disposing or has been disposed.');
    }
    const internal = getInternalPlugin(plugin);
    if (!internal) {
      throw new PluginHostError('INVALID_DEFINITION', 'Plugin must be created with definePlugin().');
    }

    const definition = internal.definition as unknown as PluginDefinition<unknown, ServiceBindings, ServiceBindings>;
    const requires = definition.requires ?? {};
    const provides = definition.provides ?? {};
    const node = this.#graph.register(plugin.name, requires, provides);

    try {
      const getMissing = () =>
        Object.values(requires).filter((token) => this.#context.get(getServiceName(token)) === undefined);
      let installation: CordisPluginInstallation;
      installation = new CordisPluginInstallation(
        definition,
        args[0],
        getMissing(),
        getMissing,
        (childPlugin, ...childArgs) => this.#install(childPlugin, childArgs, false),
        this.#publishService,
        this.#reportDependencyCleanupError,
        () => {
          this.#rootInstallations.delete(installation);
          this.#graph.remove(node);
        },
      );
      const fiber = this.#context.plugin(getCordisPlugin(internal), installation);
      installation.attachFiber(fiber);
      if (isRoot) this.#rootInstallations.add(installation);
      return installation;
    } catch (error) {
      this.#graph.remove(node);
      throw error;
    }
  }

  dispose(): Promise<void> {
    if (!this.#disposal) {
      this.#closed = true;
      this.#disposal = (async () => {
        const results = await Promise.allSettled(
          [...this.#rootInstallations].map((installation) => installation.dispose()),
        );
        const errors: unknown[] = [];
        for (const result of results) {
          if (result.status === 'fulfilled') continue;
          collectCleanupError(errors, result.reason);
        }
        if (errors.length) {
          throw new AggregateError(errors, 'Plugin Host cleanup failed.');
        }
      })();
    }
    return this.#disposal;
  }
}

export function createPluginHost(): PluginHost {
  return new CordisPluginHost();
}

function getCordisPlugin<Config, Requires extends ServiceBindings, Provides extends ServiceBindings>(
  internal: InternalPlugin<Config, Requires, Provides>,
): CordisPluginCallback {
  let plugin = cordisPlugins.get(internal);
  if (!plugin) {
    plugin = async (context, installation) => installation.activate(context as RuntimeContext);
    plugin.inject = Object.values(internal.definition.requires ?? {}).map(getServiceName);
    cordisPlugins.set(internal, plugin);
  }
  return plugin;
}
