import { assertLayoutCapabilities, createLayoutInput, LayoutError, validateLayoutProposal } from '@cflow/layout-api';
import { commandService } from '@cflow/plugin-command';
import { kernelService } from '@cflow/plugin-kernel';
import { definePlugin } from '@cflow/runtime-cordis';

import type { CreateLayoutPluginOptions, LayoutCommandInput, LayoutCommandResult } from './contracts';

export function createLayoutPlugin<Config>(options: CreateLayoutPluginOptions<Config>) {
  return definePlugin({
    name: `@cflow/plugin-layout:${options.engine.id}`,
    requires: { kernel: kernelService, commands: commandService },
    setup(context) {
      const registration = context.services.commands.register(
        options.command,
        async (input: LayoutCommandInput<Config>, execution): Promise<LayoutCommandResult> => {
          execution.signal.throwIfAborted();
          const layoutInput = createLayoutInput(context.services.kernel.read(), {
            mode: input.mode,
            fixedNodeIds: input.fixedNodeIds,
          });
          assertLayoutCapabilities(options.engine.id, options.engine.capabilities, layoutInput);
          const proposal = validateLayoutProposal(
            layoutInput,
            await options.engine.compute(layoutInput, input.config, { signal: execution.signal }),
          );
          execution.signal.throwIfAborted();
          const currentRevision = context.services.kernel.read().snapshot.revision;
          if (currentRevision !== proposal.sourceRevision) {
            throw new LayoutError(
              'STALE_PROPOSAL',
              'Layout Proposal was computed from an older Kernel revision.',
              Object.freeze({ sourceRevision: proposal.sourceRevision, currentRevision }),
            );
          }
          const positions = new Map(proposal.positions.map((position) => [position.id, position.position]));
          return context.services.kernel.transact(
            (transaction) => {
              for (const node of layoutInput.nodes) {
                const position = positions.get(node.id);
                if (!position) {
                  throw new Error(`Validated Layout Proposal is missing Node "${node.id}" during commit.`);
                }
                if (position.x === node.position.x && position.y === node.position.y) continue;
                const currentNode = transaction.query.getNode(node.id);
                if (!currentNode) {
                  throw new Error(`Kernel Node "${node.id}" disappeared before the Layout Transaction.`);
                }
                transaction.nodes.replace(node.id, { ...currentNode, position });
              }
            },
            { origin: 'layout', commandId: execution.commandId },
          );
        },
      );
      context.own(() => registration.dispose());
    },
  });
}
