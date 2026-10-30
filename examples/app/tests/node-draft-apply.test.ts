import { expect, test } from 'bun:test';

import {
  commandPlugin,
  commandService,
  createPluginHost,
  definePlugin,
  historyPlugin,
  historyService,
  kernelPlugin,
  kernelService,
  nodeEditingPlugin,
  nodeId,
  NodeEditingError,
  redoCommand,
  undoCommand,
  type CommandService,
  type HistoryService,
  type KernelService,
} from '@nodebraid/core';

import {
  applyNodeDraft,
  createNodeDraft,
  isNodeDraftDirty,
  projectNodeEditor,
} from '../src/example-runtime/node-draft';

async function setup() {
  const host = createPluginHost();
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(historyPlugin),
    host.install(nodeEditingPlugin),
  ];
  let services: { kernel: KernelService; commands: CommandService; history: HistoryService } | undefined;
  installations.push(
    host.install(
      definePlugin({
        requires: { kernel: kernelService, commands: commandService, history: historyService },
        setup(context) {
          services = context.services;
        },
      }),
    ),
  );
  await Promise.all(installations.map((installation) => installation.whenActive()));
  if (!services) throw new Error('Expected real Node editing services.');
  services.kernel.transact((transaction) => {
    for (const id of ['edited-node', 'selected-node']) {
      transaction.nodes.add({
        id: nodeId(id),
        type: 'step',
        position: { x: 10, y: 20 },
        size: { width: 160, height: 88 },
        data: Object.freeze({ label: id, tags: Object.freeze(['original']) }),
      });
    }
  });
  return { host, ...services };
}

test('applying a draft edits through History and returns a clean draft of the committed Node', async () => {
  const services = await setup();
  try {
    const source = services.kernel.read().query.getNode(nodeId('edited-node'))!;
    const beforeRevision = services.kernel.read().snapshot.revision;
    const draft = { ...createNodeDraft(source), label: 'Changed', tags: '["one", "two"]' };
    const next = await applyNodeDraft(services, draft, source.id);
    const committed = services.kernel.read().query.getNode(source.id)!;
    expect(services.kernel.read().snapshot.revision).toBe(beforeRevision + 1);
    expect(committed).toEqual({ ...source, data: { label: 'Changed', tags: ['one', 'two'] } });
    expect(next?.expectedNode).toBe(committed);
    expect(isNodeDraftDirty(next!)).toBe(false);
    expect(draft.label).toBe('Changed');
    expect(source.data).toEqual({ label: 'edited-node', tags: ['original'] });

    await services.commands.execute(undoCommand, undefined);
    expect(services.kernel.read().query.getNode(source.id)?.data).toBe(source.data);
    await services.commands.execute(redoCommand, undefined);
    expect(services.kernel.read().query.getNode(source.id)?.data).toBe(committed.data);
  } finally {
    await services.host.dispose();
  }
});

test('apply keeps the captured switch target but reads its current Node after the Command', async () => {
  const services = await setup();
  try {
    const view = services.kernel.read();
    const source = view.query.getNode(nodeId('edited-node'))!;
    const selected = view.query.getNode(nodeId('selected-node'))!;
    const draft = { ...createNodeDraft(source), label: 'Edited before switching' };
    const selection = { nodeIds: [selected.id], edgeIds: [] };
    const projection = projectNodeEditor(view, selection, draft);
    const applying = applyNodeDraft(services, draft, projection.afterApplyNodeId);
    selection.nodeIds = [source.id];
    services.kernel.transact((transaction) =>
      transaction.nodes.replace(selected.id, { ...selected, data: { label: 'Current target', tags: [] } }),
    );
    const next = await applying;
    expect(next?.expectedNode).toBe(services.kernel.read().query.getNode(selected.id));
    expect(next?.label).toBe('Current target');
    expect(services.kernel.read().query.getNode(source.id)?.data).toEqual({
      label: 'Edited before switching',
      tags: ['original'],
    });

    const current = services.kernel.read().query.getNode(source.id)!;
    expect(
      await applyNodeDraft(services, { ...createNodeDraft(current), label: 'No next editor' }, undefined),
    ).toBeUndefined();
    expect(services.kernel.read().query.getNode(source.id)?.data).toEqual({
      label: 'No next editor',
      tags: ['original'],
    });
  } finally {
    await services.host.dispose();
  }
});

test('unchanged and formatting-only drafts do not advance the Document or History', async () => {
  const services = await setup();
  try {
    const source = services.kernel.read().query.getNode(nodeId('edited-node'))!;
    const draft = createNodeDraft(source);
    const view = services.kernel.read();
    const history = services.history.getSnapshot();
    for (const input of [draft, { ...draft, tags: '[\n  "original"\n]' }]) {
      const next = await applyNodeDraft(services, input, source.id);
      expect(next?.expectedNode).toBe(source);
      expect(services.kernel.read()).toBe(view);
      expect(services.history.getSnapshot()).toBe(history);
    }
  } finally {
    await services.host.dispose();
  }
});

test.each(['move', 'delete', 'undo-redo'] as const)(
  'applying a draft after %s preserves the Command conflict and current graph',
  async (change) => {
    const services = await setup();
    try {
      const source = services.kernel.read().query.getNode(nodeId('edited-node'))!;
      const draft = { ...createNodeDraft(source), label: 'Unsaved' };
      if (change === 'move') {
        services.kernel.transact((transaction) =>
          transaction.nodes.replace(source.id, { ...source, position: { x: 30, y: 40 } }),
        );
      } else if (change === 'delete') {
        services.kernel.transact((transaction) => transaction.nodes.remove(source.id));
      } else {
        await services.commands.execute(undoCommand, undefined);
        await services.commands.execute(redoCommand, undefined);
      }
      const view = services.kernel.read();
      const history = services.history.getSnapshot();
      const applying = applyNodeDraft(services, draft, source.id);
      await expect(applying).rejects.toBeInstanceOf(NodeEditingError);
      await expect(applying).rejects.toMatchObject({ code: 'STALE_NODE' });
      expect(services.kernel.read()).toBe(view);
      expect(services.history.getSnapshot()).toBe(history);
      expect(draft.label).toBe('Unsaved');
    } finally {
      await services.host.dispose();
    }
  },
);

test('form conversion failures preserve their original cause and leave the graph unchanged', async () => {
  const services = await setup();
  try {
    const source = services.kernel.read().query.getNode(nodeId('edited-node'))!;
    const draft = { ...createNodeDraft(source), label: 'Unsaved' };
    const view = services.kernel.read();
    const history = services.history.getSnapshot();
    await expect(applyNodeDraft(services, { ...draft, tags: '[' }, source.id)).rejects.toBeInstanceOf(SyntaxError);
    await expect(applyNodeDraft(services, { ...draft, tags: '[1]' }, source.id)).rejects.toBeInstanceOf(TypeError);
    const failure = new Error('Cannot read the form value');
    await expect(
      applyNodeDraft(
        services,
        {
          ...draft,
          get tags(): string {
            throw failure;
          },
        },
        source.id,
      ),
    ).rejects.toBe(failure);
    expect(services.kernel.read()).toBe(view);
    expect(services.history.getSnapshot()).toBe(history);
    expect(draft.label).toBe('Unsaved');
  } finally {
    await services.host.dispose();
  }
});
