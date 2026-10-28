import { nodeId } from '@nodebraid/kernel';
import { commandService, defineCommand } from '@nodebraid/plugin-command';
import { kernelService } from '@nodebraid/plugin-kernel';
import { definePlugin } from '@nodebraid/runtime-cordis';

import type { CreateNodeInput, CreateNodeResult, UpdateNodeDataInput, UpdateNodeDataResult } from './contracts';
import { NodeEditingError } from './node-editing-error';

export const createNodeCommand = defineCommand<CreateNodeInput, CreateNodeResult>('node.create');
export const updateNodeDataCommand = defineCommand<UpdateNodeDataInput, UpdateNodeDataResult>('node.data.update');

export const nodeEditingPlugin = definePlugin({
  name: '@nodebraid/plugin-node-editing',
  requires: { kernel: kernelService, commands: commandService },
  setup(context) {
    const { kernel, commands } = context.services;
    const create = commands.register(createNodeCommand, (input, execution) => {
      execution.signal.throwIfAborted();
      assertInput(input);
      const node = input.node;
      execution.signal.throwIfAborted();
      const commit = kernel.transact((transaction) => transaction.nodes.add(node), {
        origin: 'node-editing',
        commandId: execution.commandId,
      });
      if (!commit) throw new Error('Adding a Node must produce a Commit.');
      return commit;
    });
    context.own(() => create.dispose());
    const update = commands.register(updateNodeDataCommand, (input, execution) => {
      execution.signal.throwIfAborted();
      assertInput(input);
      const expectedNode = input.expectedNode;
      assertInput(expectedNode);
      const id = expectedNode.id;
      if (typeof id !== 'string' || id.length === 0) {
        throw new NodeEditingError('INVALID_INPUT', 'Node data editing requires a source Node with an ID.');
      }
      const data = input.data;
      execution.signal.throwIfAborted();
      return kernel.transact(
        (transaction) => {
          const current = transaction.query.getNode(nodeId(id));
          if (current !== expectedNode) {
            throw new NodeEditingError(
              'STALE_NODE',
              'The Node changed since editing began. Reload it before applying the draft.',
              { nodeId: id },
            );
          }
          transaction.nodes.replace(current.id, { ...current, data });
        },
        { origin: 'node-editing', commandId: execution.commandId },
      );
    });
    context.own(() => update.dispose());
  },
});

function assertInput(value: unknown): asserts value is object {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new NodeEditingError('INVALID_INPUT', 'Node editing requires an input object.');
  }
}
