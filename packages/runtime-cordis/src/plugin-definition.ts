import type { Plugin, PluginDefinition } from './plugin-contracts';
import { PluginHostError } from './plugin-host-error';
import { inspectPlainRecord } from './plain-record';
import { getServiceName, type ServiceBindings, type ServiceTokenBase } from './service-token';

export interface InternalPlugin<Config, Requires extends ServiceBindings, Provides extends ServiceBindings> {
  readonly definition: PluginDefinition<Config, Requires, Provides>;
}

type AnyInternalPlugin = InternalPlugin<unknown, ServiceBindings, ServiceBindings>;

const internalPlugins = new WeakMap<object, AnyInternalPlugin>();

export function definePlugin<
  Config = void,
  Requires extends ServiceBindings = {},
  Provides extends ServiceBindings = {},
>(definition: PluginDefinition<Config, Requires, Provides>): Plugin<Config, Requires, Provides> {
  if (!definition || typeof definition !== 'object') {
    throw new PluginHostError('INVALID_DEFINITION', 'Plugin definition must be an object with a setup function.');
  }
  // User-defined getters may be stateful. Capture every top-level field once
  // so validation and later Activation observe the same definition.
  const name = definition.name;
  const setup = definition.setup;
  const requiresInput = definition.requires;
  const providesInput = definition.provides;
  if (name !== undefined && typeof name !== 'string') {
    throw new PluginHostError('INVALID_DEFINITION', 'Plugin definition name must be a string when provided.');
  }
  if (typeof setup !== 'function') {
    throw new PluginHostError('INVALID_DEFINITION', 'Plugin definition must include a setup function.');
  }
  const requires = normalizeServiceBindings(requiresInput, 'requires') as Requires;
  const provides = normalizeServiceBindings(providesInput, 'provides') as Provides;
  const requiredTokens = new Set(Object.values(requires));
  for (const token of Object.values(provides)) {
    if (requiredTokens.has(token)) {
      throw new PluginHostError(
        'INVALID_DEFINITION',
        `Plugin "${name ?? '<anonymous>'}" cannot require and provide Service Token "${token.name}".`,
      );
    }
  }
  const frozenDefinition: PluginDefinition<Config, Requires, Provides> = Object.freeze({
    name,
    requires,
    provides,
    setup,
  });
  const plugin = Object.freeze({ name, requires, provides }) as Plugin<Config, Requires, Provides>;
  internalPlugins.set(plugin, { definition: frozenDefinition } as unknown as AnyInternalPlugin);
  return plugin;
}

export function getInternalPlugin<Config, Requires extends ServiceBindings, Provides extends ServiceBindings>(
  plugin: Plugin<Config, Requires, Provides>,
): InternalPlugin<Config, Requires, Provides> | undefined {
  return internalPlugins.get(plugin) as InternalPlugin<Config, Requires, Provides> | undefined;
}

function normalizeServiceBindings(bindings: ServiceBindings | undefined, field: string): ServiceBindings {
  if (bindings === undefined) return Object.freeze({});
  const inspection = inspectPlainRecord(bindings, 'invalid-value');
  if (inspection.status === 'invalid-value') {
    throw new PluginHostError('INVALID_DEFINITION', `Plugin ${field} must be a Service Binding record.`);
  }
  if (inspection.status === 'invalid-prototype') {
    throw new PluginHostError('INVALID_DEFINITION', `Plugin ${field} must be a plain Service Binding record.`);
  }
  if (inspection.status === 'invalid-key') {
    throw new PluginHostError(
      'INVALID_DEFINITION',
      `Plugin ${field} must contain only enumerable string Service Bindings.`,
    );
  }

  const normalized: Record<string, ServiceTokenBase> = {};
  for (const binding of inspection.keys) {
    const descriptor = Object.getOwnPropertyDescriptor(inspection.record, binding)!;
    if (!descriptor.enumerable) {
      throw new PluginHostError(
        'INVALID_DEFINITION',
        `Plugin ${field} must contain only enumerable string Service Bindings.`,
      );
    }
    const token = Reflect.get(inspection.record, binding) as ServiceTokenBase;
    getServiceName(token);
    Object.defineProperty(normalized, binding, {
      enumerable: true,
      value: token,
    });
  }
  return Object.freeze(normalized);
}
