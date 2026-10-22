import { expect, test } from 'bun:test';
import { edgeId, nodeId } from '@nodebraid/kernel';
import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { sessionPlugin, sessionService, type SessionService } from '@nodebraid/plugin-session';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';
import { createDuplicateSelectionPlugin, duplicateSelectionCommand, type DuplicateIdMaterializer } from '../src';

const source = nodeId('source'),
  copy = nodeId('copy');
const loop = edgeId('source-loop'),
  copyLoop = edgeId('copy-loop');
const mappings = () => ({
  nodes: [{ sourceId: source, duplicateId: copy }],
  edges: [{ sourceId: loop, duplicateId: copyLoop }],
});

async function harness(materializeIds: DuplicateIdMaterializer) {
  let commands: CommandService | undefined, kernel: KernelService | undefined, session: SessionService | undefined;
  const consumer = definePlugin({
    requires: { commands: commandService, kernel: kernelService, session: sessionService },
    setup(context) {
      commands = context.services.commands;
      kernel = context.services.kernel;
      session = context.services.session;
    },
  });
  const host = createPluginHost();
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createDuplicateSelectionPlugin({ materializeIds })),
    host.install(consumer),
  ];
  await Promise.all(installations.map((i) => i.whenActive()));
  if (!commands || !kernel || !session) throw new Error('Expected public Duplicate mapping services.');
  kernel.transact((tx) => {
    tx.nodes.add({ id: source, type: 'task', position: { x: 0, y: 0 }, data: null });
    tx.edges.add({ id: loop, type: 'flow', source: { nodeId: source }, target: { nodeId: source }, data: null });
  });
  session.setSelection({ nodeIds: [source], edgeIds: [loop] });
  return { host, commands, kernel, session };
}

test.each(['nodes', 'edges'] as const)(
  'Duplicate rejects actual invalid %s mappings instead of custom map output',
  async (field) => {
    const input = mappings();
    Object.defineProperty(input[field][0], 'duplicateId', { value: 42 });
    let hookCalls = 0;
    Object.defineProperty(input[field], 'map', {
      value() {
        hookCalls++;
        return [{ sourceId: field === 'nodes' ? source : loop, materializedId: field === 'nodes' ? copy : copyLoop }];
      },
    });
    const h = await harness(() => input);
    try {
      const before = h.kernel.read().snapshot,
        selection = h.session.getSnapshot().selection;
      await expect(h.commands.execute(duplicateSelectionCommand, undefined)).rejects.toMatchObject({
        domain: 'plugin.duplicate-selection',
        code: 'INVALID_MATERIALIZATION',
      });
      expect(h.kernel.read().snapshot).toBe(before);
      expect(h.session.getSnapshot().selection).toBe(selection);
      expect(hookCalls).toBe(0);
    } finally {
      await h.host.dispose();
    }
  },
);

test.each(['nodes', 'edges'] as const)(
  'Duplicate retains the %s collection accepted before translation',
  async (field) => {
    const input = mappings(),
      initial = input[field];
    let reads = 0;
    Object.defineProperty(input, field, {
      get() {
        return ++reads === 1 ? initial : [];
      },
    });
    const h = await harness(() => input);
    try {
      await expect(h.commands.execute(duplicateSelectionCommand, undefined)).resolves.toMatchObject({
        changeSet: { revision: 2 },
      });
      expect(h.session.getSnapshot().selection).toEqual({ nodeIds: [copy], edgeIds: [copyLoop] });
      expect(reads).toBe(1);
    } finally {
      await h.host.dispose();
    }
  },
);

test('Duplicate accepts frozen mappings without consulting collection hooks', async () => {
  const input = mappings();
  for (const values of [input.nodes, input.edges]) {
    for (const key of ['map', 'constructor', Symbol.iterator])
      Object.defineProperty(values, key, {
        get() {
          throw new Error('collection hooks must not choose mappings');
        },
      });
    Object.freeze(values);
  }
  const h = await harness(() => input);
  try {
    await expect(h.commands.execute(duplicateSelectionCommand, undefined)).resolves.toMatchObject({
      changeSet: { revision: 2 },
    });
    expect(h.kernel.read().query.getNode(copy)?.position).toEqual({ x: 24, y: 24 });
    expect(h.kernel.read().query.getEdge(copyLoop)).toMatchObject({
      source: { nodeId: copy },
      target: { nodeId: copy },
    });
  } finally {
    await h.host.dispose();
  }
});

test.each(['nodes', 'edges'] as const)('Duplicate preserves the original %s element read failure', async (field) => {
  const input = mappings(),
    failure = new Error('mapping element read failed');
  Object.defineProperty(input[field], '0', {
    get() {
      throw failure;
    },
  });
  const h = await harness(() => input);
  try {
    const before = h.kernel.read().snapshot;
    await expect(h.commands.execute(duplicateSelectionCommand, undefined)).rejects.toBe(failure);
    expect(h.kernel.read().snapshot).toBe(before);
  } finally {
    await h.host.dispose();
  }
});

test('Duplicate rejects an invalid Node collection before reading Edge mappings', async () => {
  let edgeReads = 0;
  const input = {
    nodes: null,
    get edges() {
      edgeReads++;
      throw new Error('later field must not be read');
    },
  };
  const h = await harness(() => input as never);
  try {
    const before = h.kernel.read().snapshot;
    await expect(h.commands.execute(duplicateSelectionCommand, undefined)).rejects.toMatchObject({
      domain: 'plugin.duplicate-selection',
      code: 'INVALID_MATERIALIZATION',
    });
    expect(h.kernel.read().snapshot).toBe(before);
    expect(edgeReads).toBe(0);
  } finally {
    await h.host.dispose();
  }
});

test.each(['hole', 'inherited', 'string-length'] as const)(
  'Duplicate retains native mapping index behavior for %s',
  async (mode) => {
    const input = mappings(),
      first = input.nodes[0]!;
    if (mode === 'hole' || mode === 'inherited') delete input.nodes[0];
    if (mode === 'inherited') {
      const prototype = Object.create(Array.prototype);
      Object.defineProperty(prototype, '0', { value: first });
      Object.setPrototypeOf(input.nodes, prototype);
    }
    if (mode === 'string-length')
      input.nodes = new Proxy(input.nodes, {
        get(target, key, receiver) {
          return key === 'length' ? '1' : Reflect.get(target, key, receiver);
        },
      });
    const h = await harness(() => input);
    try {
      const before = h.kernel.read().snapshot;
      if (mode === 'hole') {
        await expect(h.commands.execute(duplicateSelectionCommand, undefined)).rejects.toMatchObject({
          code: 'INVALID_MATERIALIZATION',
        });
        expect(h.kernel.read().snapshot).toBe(before);
      } else {
        await expect(h.commands.execute(duplicateSelectionCommand, undefined)).resolves.toMatchObject({
          changeSet: { revision: 2 },
        });
        expect(h.session.getSnapshot().selection).toEqual({ nodeIds: [copy], edgeIds: [copyLoop] });
      }
    } finally {
      await h.host.dispose();
    }
  },
);
