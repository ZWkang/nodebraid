import { expect, test } from 'bun:test';
import { nodeId } from '@nodebraid/kernel';
import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import {
  historyPlugin,
  historyService,
  undoCommand,
  redoCommand,
  type HistoryService,
} from '@nodebraid/plugin-history';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { portPlugin } from '@nodebraid/plugin-port';
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
import { interactionPlugin, moveNodesCommand, type MoveNodeInput, type MoveNodesInput } from '../src';
const a = nodeId('a'),
  b = nodeId('b');
const data = { opaque: true };
async function activate() {
  let commands: CommandService | undefined, kernel: KernelService | undefined, history: HistoryService | undefined;
  const host = createPluginHost();
  const consumer = definePlugin({
    requires: { commands: commandService, kernel: kernelService, history: historyService },
    setup(c) {
      commands = c.services.commands;
      kernel = c.services.kernel;
      history = c.services.history;
    },
  });
  const installations = [
    host.install(kernelPlugin),
    host.install(portPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(historyPlugin),
    host.install(createRendererPlugin(() => new CommandRenderer())),
    host.install(interactionPlugin),
    host.install(consumer),
  ];
  await Promise.all(installations.map((i) => i.whenActive()));
  if (!commands || !kernel || !history) throw new Error('Expected actual Move Command Services');
  kernel.transact((tx) => {
    tx.nodes.add({ id: a, type: 'task', position: { x: 0, y: 0 }, data });
    tx.nodes.add({ id: b, type: 'task', position: { x: 100, y: 0 }, size: { width: 20, height: 30 }, data });
  });
  return { host, commands, kernel, history };
}
function validMove(): MoveNodeInput {
  return { nodeId: a, basePosition: { x: 0, y: 0 }, position: { x: 10, y: 20 } };
}
test('Move Nodes cannot substitute a stale target through repeated caller array traversal', async () => {
  const { host, commands, kernel, history } = await activate();
  try {
    const before = kernel.read(),
      historyBefore = history.getSnapshot(),
      allowed = validMove();
    const stale: MoveNodeInput = { nodeId: b, basePosition: { x: 99, y: 0 }, position: { x: 120, y: 0 } };
    const moves = [allowed, stale];
    let traversals = 0;
    Object.defineProperty(moves, Symbol.iterator, {
      value: function* () {
        traversals++;
        yield traversals < 4 ? allowed : stale;
      },
    });
    await expect(commands.execute(moveNodesCommand, { moves })).rejects.toMatchObject({
      domain: 'interaction',
      code: 'STALE_GESTURE',
    });
    expect(kernel.read()).toBe(before);
    expect(history.getSnapshot()).toBe(historyBefore);
    await commands.execute(undoCommand, undefined);
    expect(kernel.read().snapshot.nodes).toEqual([]);
    await commands.execute(redoCommand, undefined);
    expect(kernel.read().query.getNode(b)?.position).toEqual({ x: 100, y: 0 });
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
  'moves',
  'length',
  'entry',
  'nodeId',
  'basePosition',
  'base.x',
  'base.y',
  'position',
  'position.x',
  'position.y',
] as const;
type Stage = (typeof stages)[number];
function tracedInput(failAt?: Stage, reason?: unknown, form: 'own' | 'non-enumerable' | 'inherited' = 'own') {
  const trace: Stage[] = [];
  const read = <T>(stage: Stage, value: T): T => {
    trace.push(stage);
    if (stage === failAt) throw reason;
    if (trace.filter((s) => s === stage).length > 1) throw new Error('Move input value reread: ' + stage);
    return value;
  };
  const base = {
    get x() {
      expect(this).toBe(base);
      return read('base.x', 0);
    },
    get y() {
      return read('base.y', 0);
    },
  };
  const point = {
    get x() {
      return read('position.x', 10);
    },
    get y() {
      return read('position.y', 20);
    },
  };
  const move: MoveNodeInput = {
    get nodeId() {
      expect(this).toBe(move);
      return read('nodeId', a);
    },
    get basePosition() {
      return read('basePosition', base);
    },
    get position() {
      return read('position', point);
    },
  };
  const entries = [move];
  Object.defineProperty(entries, '0', {
    get() {
      return read('entry', move);
    },
  });
  const moves = new Proxy(entries, {
    get(target, key, receiver) {
      if (key === 'length') return read('length', 1);
      return Reflect.get(target, key, receiver);
    },
  });
  const input: MoveNodesInput = {
    get moves() {
      expect(this).toBe(input);
      return read('moves', moves);
    },
  };
  if (form !== 'own') {
    for (const [value, fields] of [
      [input, ['moves']],
      [move, ['nodeId', 'basePosition', 'position']],
      [base, ['x', 'y']],
      [point, ['x', 'y']],
    ] as const) {
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
  'Move Nodes retains valid first values from %s fields and receivers',
  async (form) => {
    const { host, commands, kernel } = await activate();
    try {
      const { input, trace } = tracedInput(undefined, undefined, form);
      const result = await commands.execute(moveNodesCommand, input);
      expect(result?.changeSet).toMatchObject({ origin: 'interaction', commandId: 'interaction.nodes.move' });
      expect(trace).toEqual([...stages]);
      expect(kernel.read().query.getNode(a)?.position).toEqual({ x: 10, y: 20 });
    } finally {
      await host.dispose();
    }
  },
);
test.each([...stages])('Move Nodes preserves the original %s read failure before committing', async (stage) => {
  const { host, commands, kernel, history } = await activate();
  try {
    const original = new Error('original ' + stage),
      before = kernel.read(),
      historyBefore = history.getSnapshot(),
      { input, trace } = tracedInput(stage, original);
    expect(await failure(commands.execute(moveNodesCommand, input))).toBe(original);
    expect(trace).toEqual(stages.slice(0, stages.indexOf(stage) + 1));
    expect(kernel.read()).toBe(before);
    expect(history.getSnapshot()).toBe(historyBefore);
  } finally {
    await host.dispose();
  }
});
test.each([null, undefined, 0, Symbol('original')])(
  'Move Nodes preserves the original non-Error thrown value %s',
  async (original) => {
    const { host, commands, kernel } = await activate();
    try {
      const before = kernel.read(),
        { input } = tracedInput('entry', original);
      expect(await failure(commands.execute(moveNodesCommand, input))).toBe(original);
      expect(kernel.read()).toBe(before);
    } finally {
      await host.dispose();
    }
  },
);
test('Move Nodes observes abort before any input read', async () => {
  const { host, commands, kernel } = await activate();
  try {
    const before = kernel.read(),
      { input, trace } = tracedInput(),
      controller = new AbortController(),
      reason = new Error('caller cancelled');
    controller.abort(reason);
    expect(await failure(commands.execute(moveNodesCommand, input, { signal: controller.signal }))).toBe(reason);
    expect(trace).toEqual([]);
    expect(kernel.read()).toBe(before);
  } finally {
    await host.dispose();
  }
});
for (const field of ['basePosition', 'position'] as const)
  for (const scalar of ['x', 'y'] as const) {
    test(
      'Move Nodes retains the first nonfinite ' + field + '.' + scalar + ', rather than a later finite value',
      async () => {
        const { host, commands, kernel } = await activate();
        try {
          const before = kernel.read(),
            move = validMove(),
            point = { ...move[field] };
          let reads = 0;
          Object.defineProperty(point, scalar, {
            get() {
              reads++;
              return reads === 1 ? Number.NaN : 0;
            },
          });
          const input = { moves: [{ ...move, [field]: point }] };
          await expect(commands.execute(moveNodesCommand, input)).rejects.toMatchObject({
            domain: 'interaction',
            code: 'INVALID_MOVE',
          });
          expect(reads).toBe(1);
          expect(kernel.read()).toBe(before);
        } finally {
          await host.dispose();
        }
      },
    );
  }
for (const early of ['duplicate', 'nonfinite'] as const) {
  test('Move Nodes keeps whole-input shape failures before ' + early + ' validation', async () => {
    const { host, commands, kernel } = await activate();
    try {
      const before = kernel.read(),
        original = new Error('later entry read');
      const first = validMove(),
        moves =
          early === 'duplicate' ? [first, first, first] : [{ ...first, position: { x: Number.NaN, y: 0 } }, first];
      Object.defineProperty(moves, String(moves.length - 1), {
        get() {
          throw original;
        },
      });
      expect(await failure(commands.execute(moveNodesCommand, { moves }))).toBe(original);
      expect(kernel.read()).toBe(before);
    } finally {
      await host.dispose();
    }
  });
}
test('Move Nodes rejects a sparse indexed entry even if caller hooks hide it', async () => {
  const { host, commands, kernel } = await activate();
  try {
    const before = kernel.read(),
      moves: MoveNodeInput[] = [validMove()];
    moves.length = 2;
    Object.defineProperty(moves, Symbol.iterator, {
      value: function* () {
        yield moves[0]!;
      },
    });
    await expect(commands.execute(moveNodesCommand, { moves })).rejects.toMatchObject({ code: 'INVALID_MOVE' });
    expect(kernel.read()).toBe(before);
  } finally {
    await host.dispose();
  }
});
test('Move Nodes does not call caller traversal, map, constructor or species hooks', async () => {
  const { host, commands, kernel } = await activate();
  try {
    const moves = [validMove()];
    for (const key of [Symbol.iterator, 'map', 'constructor', Symbol.species])
      Object.defineProperty(moves, key, {
        get() {
          throw new Error('Caller traversal hook read');
        },
      });
    await commands.execute(moveNodesCommand, { moves });
    expect(kernel.read().query.getNode(a)?.position).toEqual({ x: 10, y: 20 });
  } finally {
    await host.dispose();
  }
});
test.each([1.5, '1.5'])('Move Nodes retains native array-like positive length normalization %s', async (length) => {
  const { host, commands, kernel } = await activate();
  try {
    const moves = new Proxy([validMove(), { nodeId: b, basePosition: { x: 99, y: 0 }, position: { x: 120, y: 0 } }], {
      get(target, key, receiver) {
        return key === 'length' ? length : Reflect.get(target, key, receiver);
      },
    });
    await commands.execute(moveNodesCommand, { moves });
    expect(kernel.read().query.getNode(a)?.position).toEqual({ x: 10, y: 20 });
    expect(kernel.read().query.getNode(b)?.position.x).toBe(100);
  } finally {
    await host.dispose();
  }
});
test.each([0.5, -1, Number.NaN, undefined, '0'])(
  'Move Nodes rejects a native-normalized empty input length %s',
  async (length) => {
    const { host, commands, kernel } = await activate();
    try {
      const before = kernel.read(),
        moves = new Proxy([validMove()], {
          get(target, key, receiver) {
            return key === 'length' ? length : Reflect.get(target, key, receiver);
          },
        });
      await expect(commands.execute(moveNodesCommand, { moves })).rejects.toMatchObject({ code: 'INVALID_MOVE' });
      expect(kernel.read()).toBe(before);
    } finally {
      await host.dispose();
    }
  },
);
test.each([1n, Symbol('length')])(
  'Move Nodes exposes native length coercion failure %s before entries',
  async (length) => {
    const { host, commands, kernel } = await activate();
    try {
      const before = kernel.read(),
        moves = new Proxy([validMove()], {
          get(target, key, receiver) {
            if (key === 'length') return length;
            if (key === '0') throw new Error('Entry must not precede native length coercion');
            return Reflect.get(target, key, receiver);
          },
        });
      expect(await failure(commands.execute(moveNodesCommand, { moves }))).toBeInstanceOf(TypeError);
      expect(kernel.read()).toBe(before);
    } finally {
      await host.dispose();
    }
  },
);
test('Move Nodes reads the length conversion once and cannot hide the original first entry failure behind allocation', async () => {
  const { host, commands, kernel } = await activate();
  try {
    const original = new Error('first entry failure'),
      before = kernel.read();
    let conversions = 0;
    const moves = new Proxy([validMove()], {
      get(target, key, receiver) {
        if (key === 'length')
          return {
            valueOf() {
              conversions++;
              return Number.POSITIVE_INFINITY;
            },
          };
        if (key === '0') throw original;
        return Reflect.get(target, key, receiver);
      },
    });
    expect(await failure(commands.execute(moveNodesCommand, { moves }))).toBe(original);
    expect(conversions).toBe(1);
    expect(kernel.read()).toBe(before);
  } finally {
    await host.dispose();
  }
});
test('Move Nodes retains owned earlier Point values, Node fields and one atomic History entry', async () => {
  const { host, commands, kernel, history } = await activate();
  try {
    const before = kernel.read();
    await expect(
      commands.execute(moveNodesCommand, { moves: [{ ...validMove(), position: { x: 0, y: 0 } }] }),
    ).resolves.toBeNull();
    expect(kernel.read()).toBe(before);
    const first = validMove();
    const second: MoveNodeInput = {
      nodeId: b,
      basePosition: { x: 100, y: 0 },
      get position() {
        Reflect.set(first.position, 'x', 999);
        return { x: 120, y: 30 };
      },
    };
    const result = await commands.execute(moveNodesCommand, { moves: [first, second] });
    expect(result?.changeSet.changes.map((change) => change.id)).toEqual([a, b]);
    expect(kernel.read().query.getNode(a)?.position).toEqual({ x: 10, y: 20 });
    expect(kernel.read().query.getNode(b)).toMatchObject({
      id: b,
      type: 'task',
      size: { width: 20, height: 30 },
      position: { x: 120, y: 30 },
    });
    expect(kernel.read().query.getNode(b)?.data).toBe(data);
    expect(history.getSnapshot()).toEqual({ canUndo: true, canRedo: false });
    await commands.execute(undoCommand, undefined);
    expect(kernel.read().query.getNode(a)?.position).toEqual({ x: 0, y: 0 });
    expect(kernel.read().query.getNode(b)?.position).toEqual({ x: 100, y: 0 });
    await commands.execute(redoCommand, undefined);
    expect(kernel.read().query.getNode(a)?.position).toEqual({ x: 10, y: 20 });
    expect(kernel.read().query.getNode(b)?.position).toEqual({ x: 120, y: 30 });
  } finally {
    await host.dispose();
  }
});
