import type { ProvidedServices } from './plugin-contracts';
import { PluginHostError } from './plugin-host-error';
import { inspectPlainRecord } from './plain-record';
import type { BoundServices, ServiceBindings, ServiceTokenBase } from './service-token';

export function validateProvidedServices<Provides extends ServiceBindings>(
  pluginName: string | undefined,
  provides: Provides,
  result: ProvidedServices<Provides>,
): BoundServices<Provides> {
  const bindingsByToken = new Map<ServiceTokenBase, string>();
  for (const [binding, token] of Object.entries(provides)) {
    const duplicate = bindingsByToken.get(token);
    if (duplicate) {
      throw new PluginHostError(
        'CONTRACT_VIOLATION',
        `Plugin "${pluginName ?? '<anonymous>'}" declares Provided Service Token "${token.name}" through both "${duplicate}" and "${binding}".`,
      );
    }
    bindingsByToken.set(token, binding);
  }

  const declaredBindings = Object.keys(provides);
  if (!declaredBindings.length) {
    if (result !== undefined) {
      throw new PluginHostError(
        'CONTRACT_VIOLATION',
        `Plugin "${pluginName ?? '<anonymous>'}" returned a value without declaring a Provided Service.`,
      );
    }
    return Object.freeze(Object.create(null)) as BoundServices<Provides>;
  }
  const inspection = inspectPlainRecord(result, 'invalid-prototype');
  if (inspection.status === 'invalid-value') {
    throw new PluginHostError(
      'CONTRACT_VIOLATION',
      `Plugin "${pluginName ?? '<anonymous>'}" must return a Provided Service record.`,
    );
  }
  if (inspection.status === 'invalid-prototype') {
    throw new PluginHostError(
      'CONTRACT_VIOLATION',
      `Plugin "${pluginName ?? '<anonymous>'}" must return a plain Provided Service record.`,
    );
  }
  if (inspection.status === 'invalid-key') {
    throw new PluginHostError(
      'CONTRACT_VIOLATION',
      `Plugin "${pluginName ?? '<anonymous>'}" returned undeclared Provided Service binding "${String(inspection.key)}".`,
    );
  }
  for (const binding of inspection.keys) {
    if (!Object.hasOwn(provides, binding)) {
      throw new PluginHostError(
        'CONTRACT_VIOLATION',
        `Plugin "${pluginName ?? '<anonymous>'}" returned undeclared Provided Service binding "${String(binding)}".`,
      );
    }
  }

  const normalized = Object.create(null) as Record<string, unknown>;
  for (const binding of declaredBindings) {
    if (!Object.hasOwn(inspection.record, binding)) {
      throw new PluginHostError(
        'CONTRACT_VIOLATION',
        `Plugin "${pluginName ?? '<anonymous>'}" did not return Provided Service binding "${binding}".`,
      );
    }
    const value = (inspection.record as Record<string, unknown>)[binding];
    if (value == null) {
      throw new PluginHostError(
        'CONTRACT_VIOLATION',
        `Plugin "${pluginName ?? '<anonymous>'}" returned ${String(value)} for Provided Service binding "${binding}".`,
      );
    }
    normalized[binding] = value;
  }
  return Object.freeze(normalized) as BoundServices<Provides>;
}
