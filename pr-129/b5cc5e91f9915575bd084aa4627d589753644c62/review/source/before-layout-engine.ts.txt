import type { LayoutEngine, LayoutEngineDefinition } from './contracts';
import { assertLayoutCapabilities } from './capability-validation';
import { validateLayoutProposal } from './proposal-validation';

export function defineLayoutEngine<Config>(definition: LayoutEngineDefinition<Config>): LayoutEngine<Config> {
  const capabilities = Object.freeze({ ...definition.capabilities });
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
