import { test } from 'bun:test';

import type { Plugin } from '@nodebraid/runtime-cordis';

import {
  createEdgeCommand,
  deleteSelectionCommand,
  interactionPlugin,
  interactionShortcutService,
  moveNodesCommand,
  nodePlacementService,
  type CreateEdgeInput,
  type CreateEdgeResult,
  type DeleteSelectionInput,
  type DeleteSelectionResult,
  type InteractionConfig,
  type InteractionShortcutService,
  type MoveNodesInput,
  type MoveNodesResult,
  type NodeMaterializer,
  type NodePlacement,
  type NodePlacementResult,
  type NodePlacementService,
} from '../src';

test('publishes Interaction as a Runtime Plugin with a narrow Shortcut contribution Service', () => {
  const plugin: Plugin<InteractionConfig | undefined> = interactionPlugin;
  const shortcutService: typeof interactionShortcutService = interactionShortcutService;
  const verifyShortcutService = (service: InteractionShortcutService) => service;
  const verifyCommand = (input: MoveNodesInput): MoveNodesResult | PromiseLike<MoveNodesResult> => {
    void input;
    return Promise.resolve(null);
  };
  expectCommand(moveNodesCommand.id);
  void plugin;
  void shortcutService;
  void verifyShortcutService;
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
  const placementToken: typeof nodePlacementService = nodePlacementService;
  const verifyPlacement = (service: NodePlacementService, materializeNode: NodeMaterializer): NodePlacement =>
    service.begin(materializeNode);
  const verifyResult = (request: NodePlacement): Promise<NodePlacementResult> => request.result;
  void placementToken;
  void verifyPlacement;
  void verifyResult;
});

function expectCommand(id: string): void {
  if (id !== 'interaction.nodes.move' && id !== 'interaction.edge.create' && id !== 'interaction.selection.delete') {
    throw new Error('Unexpected Interaction Command ID.');
  }
}
