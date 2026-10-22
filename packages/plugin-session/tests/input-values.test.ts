import { expect, test } from 'bun:test';
import { edgeId, nodeId } from '@nodebraid/kernel';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';
import { sessionPlugin, sessionService, type SessionService } from '../src';

const a = nodeId('a'),
  b = nodeId('b'),
  ab = edgeId('ab');
async function harness() {
  let kernel: KernelService | undefined, session: SessionService | undefined;
  const consumer = definePlugin({
    requires: { kernel: kernelService, session: sessionService },
    setup(context) {
      kernel = context.services.kernel;
      session = context.services.session;
    },
  });
  const host = createPluginHost();
  const installs = [host.install(kernelPlugin), host.install(sessionPlugin), host.install(consumer)];
  await Promise.all(installs.map((i) => i.whenActive()));
  if (!kernel || !session) throw new Error('Expected public Session input services.');
  kernel.transact((tx) => {
    for (const id of [a, b]) tx.nodes.add({ id, type: 'task', position: { x: 0, y: 0 }, data: null });
    tx.edges.add({ id: ab, type: 'flow', source: { nodeId: a }, target: { nodeId: b }, data: null });
  });
  session.setSelection({ nodeIds: [a], edgeIds: [] });
  return { host, kernel, session };
}

test.each(['x', 'y', 'zoom'] as const)(
  'Session publishes the %s value accepted during Viewport validation',
  async (field) => {
    const input = { x: 10, y: 20, zoom: 2 },
      accepted = input[field];
    let reads = 0;
    Object.defineProperty(input, field, {
      get() {
        return ++reads === 1 ? accepted : field === 'zoom' ? 0 : Number.NaN;
      },
    });
    const h = await harness();
    try {
      h.session.setViewport(input);
      expect(h.session.getSnapshot().viewport).toEqual({ x: 10, y: 20, zoom: 2 });
      expect(reads).toBe(1);
      expect(Object.isFrozen(h.session.getSnapshot().viewport)).toBeTrue();
    } finally {
      await h.host.dispose();
    }
  },
);

test.each(['nodeIds', 'edgeIds'] as const)(
  'Session retains the %s collection accepted during validation',
  async (field) => {
    const input = { nodeIds: [b], edgeIds: [ab] },
      first = input[field];
    let reads = 0;
    Object.defineProperty(input, field, {
      get() {
        return ++reads === 1 ? first : [];
      },
    });
    const h = await harness();
    try {
      h.session.setSelection(input);
      expect(h.session.getSnapshot().selection).toEqual({ nodeIds: [b], edgeIds: [ab] });
      expect(reads).toBe(1);
    } finally {
      await h.host.dispose();
    }
  },
);

test.each(['nodeIds', 'edgeIds'] as const)(
  'Session retains the %s element accepted during validation',
  async (field) => {
    const input = { nodeIds: [b], edgeIds: [ab] },
      first = input[field][0];
    let reads = 0;
    Object.defineProperty(input[field], '0', {
      get() {
        return ++reads === 1 ? first : field === 'nodeIds' ? a : edgeId('missing');
      },
    });
    const h = await harness();
    try {
      h.session.setSelection(input);
      expect(h.session.getSnapshot().selection).toEqual({ nodeIds: [b], edgeIds: [ab] });
      expect(reads).toBe(1);
    } finally {
      await h.host.dispose();
    }
  },
);

test.each(['nodeIds', 'edgeIds'] as const)(
  'Session rejects an actual unknown %s member hidden by an iterator',
  async (field) => {
    const input = { nodeIds: [a], edgeIds: [] },
      ids = [field === 'nodeIds' ? nodeId('missing') : edgeId('missing')];
    let iteratorCalls = 0;
    Object.defineProperty(ids, Symbol.iterator, {
      value: function* () {
        iteratorCalls++;
      },
    });
    Object.defineProperty(input, field, { value: ids });
    const h = await harness();
    try {
      const before = h.session.getSnapshot();
      expect(() => h.session.setSelection(input)).toThrow(
        expect.objectContaining({ domain: 'plugin.session', code: 'SELECTION_ENTITY_NOT_FOUND' }),
      );
      expect(h.session.getSnapshot()).toBe(before);
      expect(iteratorCalls).toBe(0);
    } finally {
      await h.host.dispose();
    }
  },
);

test('Session canonicalizes frozen indexed IDs without consulting caller collection hooks', async () => {
  const input = { nodeIds: [b, a, b], edgeIds: [ab, ab] };
  for (const ids of [input.nodeIds, input.edgeIds]) {
    for (const key of ['map', 'constructor', Symbol.iterator])
      Object.defineProperty(ids, key, {
        get() {
          throw new Error('collection hooks must not choose Session values');
        },
      });
    Object.freeze(ids);
  }
  const h = await harness();
  try {
    h.session.setSelection(input);
    const selection = h.session.getSnapshot().selection;
    expect(selection).toEqual({ nodeIds: [a, b], edgeIds: [ab] });
    expect(Object.isFrozen(selection.nodeIds)).toBeTrue();
    expect(Object.isFrozen(selection.edgeIds)).toBeTrue();
    expect(selection.nodeIds).not.toBe(input.nodeIds);
  } finally {
    await h.host.dispose();
  }
});

test.each(['viewport', 'selection-index', 'selection-field'] as const)(
  'Session retains original %s read failures and ordering',
  async (mode) => {
    const failure = new Error('input read failed'),
      reads: string[] = [];
    const h = await harness();
    try {
      const before = h.session.getSnapshot();
      let received: unknown;
      try {
        if (mode === 'viewport')
          h.session.setViewport({
            get x() {
              reads.push('x');
              return NaN;
            },
            get y(): never {
              reads.push('y');
              throw failure;
            },
            get zoom() {
              reads.push('zoom');
              return 1;
            },
          });
        else if (mode === 'selection-index') {
          const ids = [b];
          Object.defineProperty(ids, '0', {
            get() {
              reads.push('node:0');
              throw failure;
            },
          });
          h.session.setSelection({
            get nodeIds() {
              reads.push('nodes');
              return ids;
            },
            get edgeIds() {
              reads.push('edges');
              return [ab];
            },
          });
        } else
          h.session.setSelection({
            get nodeIds() {
              reads.push('nodes');
              return null as never;
            },
            get edgeIds(): never {
              reads.push('edges');
              throw failure;
            },
          });
      } catch (error) {
        received = error;
      }
      expect(received).toBe(failure);
      expect(h.session.getSnapshot()).toBe(before);
      expect(reads).toEqual(
        mode === 'viewport' ? ['x', 'y'] : mode === 'selection-index' ? ['nodes', 'node:0'] : ['nodes', 'edges'],
      );
    } finally {
      await h.host.dispose();
    }
  },
);

test('Session owns one native length snapshot before validating and publishing IDs', async () => {
  let lengthReads = 0;
  const ids = new Proxy([b, a], {
    get(target, key, receiver) {
      return key === 'length' ? (++lengthReads === 1 ? 2 : 0) : Reflect.get(target, key, receiver);
    },
  });
  const h = await harness();
  try {
    h.session.setSelection({ nodeIds: ids, edgeIds: [] });
    expect(h.session.getSnapshot().selection.nodeIds).toEqual([a, b]);
    expect(lengthReads).toBe(1);
  } finally {
    await h.host.dispose();
  }
});

test.each(['nodeIds', 'edgeIds'] as const)(
  'Session normalizes the captured coercible %s length once',
  async (field) => {
    const ids = field === 'nodeIds' ? [b, nodeId('missing')] : [ab, edgeId('missing')];
    let lengthReads = 0,
      coercions = 0;
    const indexReads: string[] = [];
    const length = {
      valueOf() {
        return ++coercions === 1 ? 2 : 1;
      },
    };
    const values = new Proxy(ids, {
      get(target, key, receiver) {
        if (key === 'length') {
          lengthReads++;
          return length;
        }
        if (key === '0' || key === '1') indexReads.push(key);
        return Reflect.get(target, key, receiver);
      },
    });
    const input = { nodeIds: [a], edgeIds: [] };
    Object.defineProperty(input, field, { value: values });
    const h = await harness();
    try {
      const before = h.session.getSnapshot();
      expect(() => h.session.setSelection(input)).toThrow(
        expect.objectContaining({ domain: 'plugin.session', code: 'SELECTION_ENTITY_NOT_FOUND' }),
      );
      expect(h.session.getSnapshot()).toBe(before);
      expect(lengthReads).toBe(1);
      expect(coercions).toBe(1);
      expect(indexReads).toEqual(['0', '1']);
    } finally {
      await h.host.dispose();
    }
  },
);

test('Session preserves an indexed read failure before allocating from the incoming length', async () => {
  const failure = new Error('first selection ID read failed');
  let indexReads = 0;
  const ids = new Proxy([b], {
    get(target, key, receiver) {
      if (key === 'length') return Infinity;
      if (key === '0') {
        indexReads += 1;
        throw failure;
      }
      return Reflect.get(target, key, receiver);
    },
  });
  const h = await harness();
  try {
    const before = h.session.getSnapshot();
    let received: unknown;
    try {
      h.session.setSelection({ nodeIds: ids, edgeIds: [] });
    } catch (error) {
      received = error;
    }
    expect(received).toBe(failure);
    expect(indexReads).toBe(1);
    expect(h.session.getSnapshot()).toBe(before);
  } finally {
    await h.host.dispose();
  }
});

test.each(['inherited', 'string-length'] as const)('Session preserves indexed array behavior for %s', async (mode) => {
  let ids = [b];
  if (mode === 'inherited') {
    delete ids[0];
    const prototype = Object.create(Array.prototype);
    Object.defineProperty(prototype, '0', { value: b });
    Object.setPrototypeOf(ids, prototype);
  } else
    ids = new Proxy(ids, {
      get(target, key, receiver) {
        return key === 'length' ? '1' : Reflect.get(target, key, receiver);
      },
    });
  const h = await harness();
  try {
    h.session.setSelection({ nodeIds: ids, edgeIds: [] });
    expect(h.session.getSnapshot().selection.nodeIds).toEqual([b]);
  } finally {
    await h.host.dispose();
  }
});
