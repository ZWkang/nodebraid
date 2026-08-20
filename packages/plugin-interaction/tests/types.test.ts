import { test } from 'bun:test';

import type { Plugin } from '@cflow/runtime-cordis';

import { interactionPlugin, moveNodesCommand, type MoveNodesInput, type MoveNodesResult } from '../src';

test('publishes Interaction as a Runtime Plugin without a state Service', () => {
  const plugin: Plugin = interactionPlugin;
  const verifyCommand = (input: MoveNodesInput): MoveNodesResult | PromiseLike<MoveNodesResult> => {
    void input;
    return Promise.resolve(null);
  };
  expectCommand(moveNodesCommand.id);
  void plugin;
  void verifyCommand;
});

function expectCommand(id: string): void {
  if (id !== 'interaction.nodes.move') throw new Error('Unexpected Move Nodes Command ID.');
}
