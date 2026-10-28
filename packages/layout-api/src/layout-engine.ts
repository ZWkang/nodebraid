import type { LayoutEngine, LayoutEngineDefinition } from './contracts';
import { assertLayoutCapabilities } from './capability-validation';
import { validateLayoutProposal } from './proposal-validation';

export function defineLayoutEngine<Config>(definition: LayoutEngineDefinition<Config>): LayoutEngine<Config> {
  const suppliedCapabilities = definition.capabilities;
  const capabilityValues = { ...suppliedCapabilities };
  // Preserve own values and capture declared flags that a spread cannot enumerate.
  for (const capability of ['incremental', 'fixedNodes', 'selfLoops'] as const) {
    if (!Object.hasOwn(capabilityValues, capability)) {
      capabilityValues[capability] = suppliedCapabilities[capability];
    }
  }
  const capabilities = Object.freeze(capabilityValues);
  const engine: LayoutEngine<Config> = {
    id: definition.id,
    capabilities,
    async compute(input, config, context) {
      context.signal.throwIfAborted();
      assertLayoutCapabilities(definition.id, capabilities, input);
      const proposal = await definition.compute(input, config, context);
      context.signal.throwIfAborted();
      return validateLayoutProposal(input, proposal);
    },
  };
  return Object.freeze(engine);
}
