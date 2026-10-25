import { expect, test } from 'bun:test';
import { edgeId, nodeId, type CanvasEdge } from '@nodebraid/kernel';
import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import {
  historyPlugin,
  historyService,
  undoCommand,
  redoCommand,
  type HistoryService,
} from '@nodebraid/plugin-history';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { createPortContributionPlugin, portPlugin } from '@nodebraid/plugin-port';
import { createRendererPlugin } from '@nodebraid/plugin-renderer';
import { sessionPlugin } from '@nodebraid/plugin-session';
import type {
  CanvasRenderer,
  HitResult,
  RendererDocumentUpdate,
  RendererInputListener,
  ScreenPoint,
} from '@nodebraid/renderer-api';
import type { SessionSnapshot } from '@nodebraid/session-api';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';
import { interactionPlugin, createEdgeCommand, type CreateEdgeInput } from '../src';
const a = nodeId('a'),
  b = nodeId('b'),
  c = nodeId('c'),
  connectionId = edgeId('connection');
const data = { opaque: true };
async function activate() {
  let commands: CommandService | undefined, kernel: KernelService | undefined, history: HistoryService | undefined;
  const host = createPluginHost();
  const consumer = definePlugin({
    requires: { commands: commandService, kernel: kernelService, history: historyService },
    setup(context) {
      commands = context.services.commands;
      kernel = context.services.kernel;
      history = context.services.history;
    },
  });
  const installs = [
    host.install(kernelPlugin),
    host.install(portPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(historyPlugin),
    host.install(createRendererPlugin(() => new CommandRenderer())),
    host.install(interactionPlugin),
    host.install(consumer),
  ];
  await Promise.all(installs.map((i) => i.whenActive()));
  if (!commands || !kernel || !history) throw new Error('Expected actual Create Edge Services');
  kernel.transact((tx) => {
    for (const id of [a, b, c]) tx.nodes.add({ id, type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  return { host, commands, kernel, history };
}
function validInput(): CreateEdgeInput {
  return {
    edge: { id: connectionId, type: 'flow', source: { nodeId: a }, target: { nodeId: b }, data },
    source: { nodeId: a, role: 'source' },
    target: { nodeId: b, role: 'target' },
  };
}
test('Create Edge cannot replace a validated forward Edge with a later self-loop', async () => {
  const { host, commands, kernel } = await activate();
  try {
    const accepted = validInput(),
      selfLoop: CanvasEdge = { ...accepted.edge, target: { nodeId: a } };
    let reads = 0;
    const input: CreateEdgeInput = {
      ...accepted,
      get edge() {
        reads++;
        return reads < 7 ? accepted.edge : selfLoop;
      },
    };
    const commit = await commands.execute(createEdgeCommand, input);
    expect(commit.changeSet).toMatchObject({ origin: 'interaction', commandId: 'interaction.edge.create' });
    expect(kernel.read().query.getEdge(connectionId)?.target.nodeId).toBe(b);
    expect(kernel.read().query.getEdge(connectionId)?.data).toBe(data);
    expect(reads).toBe(1);
    await commands.execute(undoCommand, undefined);
    expect(kernel.read().snapshot.edges).toEqual([]);
    await commands.execute(redoCommand, undefined);
    expect(kernel.read().query.getEdge(connectionId)?.target.nodeId).toBe(b);
    expect(reads).toBe(1);
  } finally {
    await host.dispose();
  }
});
class CommandRenderer implements CanvasRenderer {
  updateDocument(_u: RendererDocumentUpdate): void {}
  updateSession(_s: SessionSnapshot): void {}
  updateInteraction(): void {}
  subscribeInput(_l: RendererInputListener): () => void {
    return () => {};
  }
  hitTest(_p: ScreenPoint): HitResult | null {
    return null;
  }
  capturePointer(_id: number): void {}
  releasePointer(_id: number): void {}
  focus(): void {}
  async dispose(): Promise<void> {}
}

const stages = [
  'edge',
  'edge.id',
  'edge.type',
  'edge.source',
  'edge.source.nodeId',
  'edge.source.portId',
  'edge.target',
  'edge.target.nodeId',
  'edge.target.portId',
  'edge.data.presence',
  'source',
  'source.nodeId',
  'source.portId',
  'source.role',
  'target',
  'target.nodeId',
  'target.portId',
  'target.role',
  'edge.data',
] as const;
type Stage = (typeof stages)[number];
function tracedInput(failAt?: Stage, reason?: unknown, form: 'own' | 'non-enumerable' | 'inherited' = 'own') {
  const trace: Stage[] = [];
  const read = <T>(stage: Stage, value: T): T => {
    trace.push(stage);
    if (stage === failAt) throw reason;
    if (trace.filter((s) => s === stage).length > 1) throw new Error('Create Edge value reread: ' + stage);
    return value;
  };
  const sourceEndpoint = {
    get nodeId() {
      expect(this).toBe(sourceEndpoint);
      return read('edge.source.nodeId', a);
    },
    get portId() {
      return read('edge.source.portId', undefined);
    },
  };
  const targetEndpoint = {
    get nodeId() {
      return read('edge.target.nodeId', b);
    },
    get portId() {
      return read('edge.target.portId', undefined);
    },
  };
  const edge: CanvasEdge = {
    get id() {
      expect(this).toBe(receivedEdge);
      return read('edge.id', connectionId);
    },
    get type() {
      return read('edge.type', 'flow');
    },
    get source() {
      return read('edge.source', sourceEndpoint);
    },
    get target() {
      return read('edge.target', targetEndpoint);
    },
    get data() {
      expect(this).toBe(receivedEdge);
      return read('edge.data', data);
    },
  };
  const receivedEdge = new Proxy(edge, {
    has(target, key) {
      if (key === 'data') read('edge.data.presence', true);
      return Reflect.has(target, key);
    },
  });
  const source: CreateEdgeInput['source'] = {
    get nodeId() {
      expect(this).toBe(source);
      return read('source.nodeId', a);
    },
    get portId() {
      return read('source.portId', undefined);
    },
    get role() {
      return read('source.role', 'source' as const);
    },
  };
  const target: CreateEdgeInput['target'] = {
    get nodeId() {
      return read('target.nodeId', b);
    },
    get portId() {
      return read('target.portId', undefined);
    },
    get role() {
      return read('target.role', 'target' as const);
    },
  };
  const input: CreateEdgeInput = {
    get edge() {
      expect(this).toBe(input);
      return read('edge', receivedEdge);
    },
    get source() {
      return read('source', source);
    },
    get target() {
      return read('target', target);
    },
  };
  if (form !== 'own') {
    const objects: [object, readonly string[]][] = [
      [input, ['edge', 'source', 'target']],
      [edge, ['id', 'type', 'source', 'target', 'data']],
      [sourceEndpoint, ['nodeId', 'portId']],
      [targetEndpoint, ['nodeId', 'portId']],
      [source, ['nodeId', 'portId', 'role']],
      [target, ['nodeId', 'portId', 'role']],
    ];
    for (const [value, fields] of objects) {
      const prototype = {};
      for (const field of fields) {
        const descriptor = Object.getOwnPropertyDescriptor(value, field)!;
        descriptor.enumerable = false;
        if (form === 'inherited') {
          Reflect.deleteProperty(value, field);
          Object.defineProperty(prototype, field, descriptor);
        } else Object.defineProperty(value, field, descriptor);
      }
      if (form === 'inherited') Object.setPrototypeOf(value, prototype);
    }
  }
  return { input, trace };
}
async function failure(operation: Promise<unknown>): Promise<unknown> {
  let rejected = false,
    received: unknown;
  try {
    await operation;
  } catch (error) {
    rejected = true;
    received = error;
  }
  expect(rejected).toBeTrue();
  return received;
}
test.each(['own', 'non-enumerable', 'inherited'] as const)(
  'Create Edge retains first values, receivers and late opaque data from %s properties',
  async (form) => {
    const { host, commands, kernel } = await activate();
    try {
      const { input, trace } = tracedInput(undefined, undefined, form);
      await commands.execute(createEdgeCommand, input);
      expect(trace).toEqual([...stages]);
      const edge = kernel.read().query.getEdge(connectionId)!;
      expect(edge).toMatchObject({ source: { nodeId: a }, target: { nodeId: b } });
      expect(edge.data).toBe(data);
      expect(Object.isFrozen(data)).toBeFalse();
      expect(Object.hasOwn(edge.source, 'portId')).toBeFalse();
    } finally {
      await host.dispose();
    }
  },
);
test.each([...stages])(
  'Create Edge preserves the original %s read failure and exact committed state',
  async (stage) => {
    const { host, commands, kernel, history } = await activate();
    try {
      const original = new Error('original ' + stage),
        before = kernel.read(),
        historyBefore = history.getSnapshot(),
        { input, trace } = tracedInput(stage, original);
      expect(await failure(commands.execute(createEdgeCommand, input))).toBe(original);
      expect(trace).toEqual(stages.slice(0, stages.indexOf(stage) + 1));
      expect(kernel.read()).toBe(before);
      expect(history.getSnapshot()).toBe(historyBefore);
    } finally {
      await host.dispose();
    }
  },
);
test.each([null, undefined, 0, Symbol('original')])(
  'Create Edge preserves a non-Error opaque-data failure %s',
  async (original) => {
    const { host, commands, kernel } = await activate();
    try {
      const before = kernel.read(),
        { input } = tracedInput('edge.data', original);
      expect(await failure(commands.execute(createEdgeCommand, input))).toBe(original);
      expect(kernel.read()).toBe(before);
    } finally {
      await host.dispose();
    }
  },
);
test('Create Edge observes abort before input getters', async () => {
  const { host, commands, kernel } = await activate();
  try {
    const before = kernel.read(),
      { input, trace } = tracedInput(),
      controller = new AbortController(),
      reason = new Error('cancelled');
    controller.abort(reason);
    expect(await failure(commands.execute(createEdgeCommand, input, { signal: controller.signal }))).toBe(reason);
    expect(trace).toEqual([]);
    expect(kernel.read()).toBe(before);
  } finally {
    await host.dispose();
  }
});
for (const mode of [
  'self-loop',
  'mismatched-endpoint',
  'wrong-role',
  'missing-node',
  'missing-port',
  'duplicate-id',
] as const) {
  test('Create Edge ' + mode + ' preflight wins before the opaque-data getter', async () => {
    const { host, commands, kernel, history } = await activate();
    try {
      if (mode === 'duplicate-id') await commands.execute(createEdgeCommand, validInput());
      const accepted = validInput(),
        input: CreateEdgeInput = {
          edge: {
            ...accepted.edge,
            source: mode === 'missing-port' ? { nodeId: a, portId: 'missing' } : accepted.edge.source,
            target:
              mode === 'self-loop'
                ? { nodeId: a }
                : mode === 'mismatched-endpoint'
                  ? { nodeId: c }
                  : mode === 'missing-node'
                    ? { nodeId: nodeId('missing') }
                    : accepted.edge.target,
            get data() {
              throw new Error('Preflight must reject before opaque data');
            },
          },
          source:
            mode === 'wrong-role'
              ? { nodeId: a, role: 'target' }
              : mode === 'missing-port'
                ? { nodeId: a, portId: 'missing', role: 'source' }
                : accepted.source,
          target:
            mode === 'self-loop'
              ? { nodeId: a, role: 'target' }
              : mode === 'missing-node'
                ? { nodeId: nodeId('missing'), role: 'target' }
                : accepted.target,
        };
      const before = kernel.read(),
        historyBefore = history.getSnapshot();
      await expect(commands.execute(createEdgeCommand, input)).rejects.toMatchObject({
        domain: 'interaction',
        code: ['self-loop', 'mismatched-endpoint', 'wrong-role'].includes(mode)
          ? 'INVALID_CONNECTION'
          : 'STALE_GESTURE',
      });
      expect(kernel.read()).toBe(before);
      expect(history.getSnapshot()).toBe(historyBefore);
    } finally {
      await host.dispose();
    }
  });
}
test('Create Edge finishes every shape check before semantic role checks', async () => {
  const { host, commands, kernel } = await activate();
  try {
    const original = new Error('target root read'),
      before = kernel.read(),
      input = validInput();
    Object.defineProperty(input, 'source', { value: { nodeId: a, role: 'target' } });
    Object.defineProperty(input, 'target', {
      get() {
        throw original;
      },
    });
    expect(await failure(commands.execute(createEdgeCommand, input))).toBe(original);
    expect(kernel.read()).toBe(before);
  } finally {
    await host.dispose();
  }
});
test('Create Edge preserves invalid-ID short circuit before Edge type reads', async () => {
  const { host, commands, kernel } = await activate();
  try {
    const before = kernel.read(),
      input = validInput();
    Object.defineProperty(input.edge, 'id', { value: '' });
    Object.defineProperty(input.edge, 'type', {
      get() {
        throw new Error('Invalid ID must precede type');
      },
    });
    await expect(commands.execute(createEdgeCommand, input)).rejects.toMatchObject({ code: 'INVALID_CONNECTION' });
    expect(kernel.read()).toBe(before);
  } finally {
    await host.dispose();
  }
});
test('Create Edge validates data presence before reading Anchor roots', async () => {
  const { host, commands, kernel } = await activate();
  try {
    const before = kernel.read(),
      input = validInput();
    Reflect.deleteProperty(input.edge, 'data');
    Object.defineProperty(input, 'source', {
      get() {
        throw new Error('Absent data must precede Anchor roots');
      },
    });
    await expect(commands.execute(createEdgeCommand, input)).rejects.toMatchObject({ code: 'INVALID_CONNECTION' });
    expect(kernel.read()).toBe(before);
  } finally {
    await host.dispose();
  }
});
test('Create Edge retains Anchor empty-Port short circuit before the target root', async () => {
  const { host, commands, kernel } = await activate();
  try {
    const before = kernel.read(),
      input = validInput();
    Object.defineProperty(input.source, 'portId', { value: '' });
    Object.defineProperty(input, 'target', {
      get() {
        throw new Error('Empty Anchor Port must precede target root');
      },
    });
    await expect(commands.execute(createEdgeCommand, input)).rejects.toMatchObject({ code: 'INVALID_CONNECTION' });
    expect(kernel.read()).toBe(before);
  } finally {
    await host.dispose();
  }
});
test('Create Edge keeps an empty Endpoint Port distinct from an absent Anchor Port', async () => {
  const { host, commands, kernel } = await activate();
  try {
    const before = kernel.read(),
      input = validInput();
    Object.defineProperty(input.edge.source, 'portId', { value: '' });
    await expect(commands.execute(createEdgeCommand, input)).rejects.toMatchObject({ code: 'INVALID_CONNECTION' });
    expect(kernel.read()).toBe(before);
  } finally {
    await host.dispose();
  }
});
test('Create Edge retains captured Port evidence across application Definition and data callbacks', async () => {
  const { host, commands, kernel } = await activate();
  try {
    const phase: string[] = [],
      input: CreateEdgeInput = {
        edge: {
          id: connectionId,
          type: 'flow',
          source: { nodeId: a, portId: 'out' },
          target: { nodeId: b, portId: 'in' },
          get data() {
            phase.push('data');
            expect(this).toBe(input.edge);
            Reflect.set(input.target, 'nodeId', c);
            return data;
          },
        },
        source: { nodeId: a, portId: 'out', role: 'source' },
        target: { nodeId: b, portId: 'in', role: 'target' },
      };
    let duringCommand = false;
    const contribution = host.install(
      createPortContributionPlugin({
        id: 'captured-command-ports',
        definePorts(node) {
          if (duringCommand) {
            phase.push('port:' + node.id);
            if (node.id === a) {
              Reflect.set(input.edge.target, 'nodeId', c);
              Reflect.set(input.target, 'nodeId', c);
              Reflect.set(input.edge.source, 'portId', 'unchecked');
              Reflect.set(input.edge, 'id', edgeId('unchecked'));
            }
          }
          if (node.id === a) return [{ id: 'out', role: 'source' }];
          if (node.id === b) return [{ id: 'in', role: 'target' }];
          return [];
        },
      }),
    );
    await contribution.whenActive();
    duringCommand = true;
    await commands.execute(createEdgeCommand, input);
    const saved = kernel.read().query.getEdge(connectionId)!;
    expect(saved).toMatchObject({ source: { nodeId: a, portId: 'out' }, target: { nodeId: b, portId: 'in' } });
    expect(saved.data).toBe(data);
    expect(kernel.read().query.getEdge(edgeId('unchecked'))).toBeUndefined();
    expect(phase.indexOf('data')).toBeGreaterThan(phase.indexOf('port:a'));
    expect(phase.indexOf('data')).toBeGreaterThan(phase.indexOf('port:b'));
    expect(phase.filter((p) => p === 'data')).toHaveLength(1);
    duringCommand = false;
    await commands.execute(undoCommand, undefined);
    expect(kernel.read().snapshot.edges).toEqual([]);
    await commands.execute(redoCommand, undefined);
    expect(kernel.read().query.getEdge(connectionId)?.target.nodeId).toBe(b);
    expect(phase.filter((p) => p === 'data')).toHaveLength(1);
  } finally {
    await host.dispose();
  }
});
