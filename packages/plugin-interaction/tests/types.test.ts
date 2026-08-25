import { test } from 'bun:test';

import type { Plugin } from '@nodebraid/runtime-cordis';

import {
  createEdgeCommand,
  deleteSelectionCommand,
  interactionPlugin,
  moveNodesCommand,
  type CreateEdgeInput,
  type CreateEdgeResult,
  type DeleteSelectionInput,
  type DeleteSelectionResult,
  type InteractionConfig,
  type MoveNodesInput,
  type MoveNodesResult,
} from '../src';

test('publishes Interaction as a Runtime Plugin without a state Service', () => {
  const plugin: Plugin<InteractionConfig | undefined> = interactionPlugin;
  const verifyCommand = (input: MoveNodesInput): MoveNodesResult | PromiseLike<MoveNodesResult> => {
    void input;
    return Promise.resolve(null);
  };
  expectCommand(moveNodesCommand.id);
  void plugin;
  void verifyCommand;
  const verifyCreateEdge = (input: CreateEdgeInput): CreateEdgeResult | PromiseLike<CreateEdgeResult> => {
    void input;
    return Promise.reject(new Error('type-only'));
  };
  expectCommand(createEdgeCommand.id);
  void verifyCreateEdge;
  const verifyDeleteSelection = (
    input: DeleteSelectionInput,
  ): DeleteSelectionResult | PromiseLike<DeleteSelectionResult> => {
    void input;
    return Promise.resolve(null);
  };
  expectCommand(deleteSelectionCommand.id);
  void verifyDeleteSelection;
});

function expectCommand(id: string): void {
  if (id !== 'interaction.nodes.move' && id !== 'interaction.edge.create' && id !== 'interaction.selection.delete') {
    throw new Error('Unexpected Interaction Command ID.');
  }
}
