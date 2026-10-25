import { expect, test } from 'bun:test';

import {
  commandPlugin,
  commandService,
  createCanvasKernel,
  createPluginHost,
  definePlugin,
  deserializeCanvasDocument,
  establishHistoryBaselineCommand,
  historyPlugin,
  historyService,
  kernelPlugin,
  kernelService,
  nodeId,
  serializeCanvasDocument,
  undoCommand,
  type CanvasDocumentDataCodec,
  type CommandService,
  type HistoryService,
  type KernelService,
} from '../src';

test('the public facade restores a file and records only subsequent editing', async () => {
  const source = createCanvasKernel();
  const restoredId = nodeId('saved');
  const codec: CanvasDocumentDataCodec = {
    format: 'test/note-v1',
    encode(data) {
      if (typeof data !== 'string') throw new TypeError('Expected a note.');
      return data;
    },
    decode: (text) => text,
  };
  source.transact((transaction) => {
    transaction.nodes.add({ id: restoredId, type: 'note', position: { x: 24, y: 36 }, data: 'Saved business note' });
  });
  const file = serializeCanvasDocument(source.read().snapshot, codec);
  const document = deserializeCanvasDocument(file, codec);
  let services!: { commands: CommandService; kernel: KernelService; history: HistoryService };
  const consumer = definePlugin({
    requires: { commands: commandService, kernel: kernelService, history: historyService },
    setup(context) {
      services = context.services;
    },
  });
  const host = createPluginHost();
  try {
    await Promise.all(
      [
        host.install(kernelPlugin),
        host.install(commandPlugin),
        host.install(historyPlugin),
        host.install(consumer),
      ].map((installation) => installation.whenActive()),
    );
    services.kernel.transact((transaction) => {
      transaction.nodes.add({ id: nodeId('old'), type: 'note', position: { x: 0, y: 0 }, data: 'Old note' });
    });
    await services.commands.execute(undoCommand, undefined);
    expect(services.history.getSnapshot()).toEqual({ canUndo: false, canRedo: true });

    await services.commands.execute(establishHistoryBaselineCommand, (transaction) => {
      const previous = services.kernel.read().snapshot;
      for (const edge of previous.edges) transaction.edges.remove(edge.id);
      for (const node of previous.nodes) transaction.nodes.remove(node.id);
      for (const node of document.nodes) transaction.nodes.add(node);
      for (const edge of document.edges) transaction.edges.add(edge);
    });
    expect(services.kernel.read().snapshot.nodes).toEqual(source.read().snapshot.nodes);
    expect(services.history.getSnapshot()).toEqual({ canUndo: false, canRedo: false });
    const restored = services.kernel.read().query.getNode(restoredId)!;
    services.kernel.transact((transaction) => {
      transaction.nodes.replace(restoredId, { ...restored, position: { x: 90, y: 80 } });
    });
    await services.commands.execute(undoCommand, undefined);
    expect(services.kernel.read().query.getNode(restoredId)).toEqual(restored);
    expect(services.history.getSnapshot()).toEqual({ canUndo: false, canRedo: true });
  } finally {
    await host.dispose();
  }
});
