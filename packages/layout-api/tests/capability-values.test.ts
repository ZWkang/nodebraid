import { expect, test } from 'bun:test';
import { createCanvasKernel, edgeId, nodeId } from '@nodebraid/kernel';

import { createLayoutInput, defineLayoutEngine, type LayoutCapabilities, type LayoutEngineDefinition } from '../src';

type Capability = keyof LayoutCapabilities;
type Shape = 'prototype' | 'hidden-own' | 'enumerable-own';
const capabilityNames = ['incremental', 'fixedNodes', 'selfLoops'] as const;
const shapes: Shape[] = ['prototype', 'hidden-own', 'enumerable-own'];

function expectThrownValue(action: () => unknown, original: unknown): void {
  let threw = false;
  let caught: unknown;
  try {
    action();
  } catch (error) {
    threw = true;
    caught = error;
  }
  expect(threw).toBe(true);
  expect(caught).toBe(original);
}

test('retains inherited Capability values in the helper Engine', async () => {
  class SupportedCapabilities implements LayoutCapabilities {
    get incremental(): boolean {
      return true;
    }
    get fixedNodes(): boolean {
      return true;
    }
    get selfLoops(): boolean {
      return true;
    }
  }

  const supplied = new SupportedCapabilities();
  let calls = 0;
  const engine = defineLayoutEngine<void>({
    id: 'inherited-capabilities',
    capabilities: supplied,
    compute(input) {
      calls += 1;
      return { sourceRevision: input.revision, positions: [] };
    },
  });
  expect(engine.capabilities).toEqual({ incremental: true, fixedNodes: true, selfLoops: true });
  expect(Object.isFrozen(engine.capabilities)).toBe(true);
  expect(Object.isFrozen(supplied)).toBe(false);
  const input = createLayoutInput(createCanvasKernel().read(), { mode: 'incremental', fixedNodeIds: [] });
  await expect(engine.compute(input, undefined, { signal: new AbortController().signal })).resolves.toEqual({
    sourceRevision: 0,
    positions: [],
  });
  expect(calls).toBe(1);
});

function suppliedCapabilities(
  shape: Shape,
  values: { incremental: boolean; fixedNodes: boolean; selfLoops: boolean },
  failure?: { field: Capability; reason: unknown },
) {
  const counts = { incremental: 0, fixedNodes: 0, selfLoops: 0 };
  const metadata = { callerOwned: true };
  const symbol = Symbol('capability metadata');
  let supplied: LayoutCapabilities;
  const read = (field: Capability, receiver: unknown): boolean => {
    expect(receiver).toBe(supplied);
    counts[field] += 1;
    if (failure?.field === field) throw failure.reason;
    return values[field];
  };
  class Inherited implements LayoutCapabilities {
    readonly metadata = metadata;
    readonly [symbol] = metadata;
    get incremental(): boolean {
      return read('incremental', this);
    }
    get fixedNodes(): boolean {
      return read('fixedNodes', this);
    }
    get selfLoops(): boolean {
      return read('selfLoops', this);
    }
  }
  const own = {
    metadata,
    [symbol]: metadata,
    get incremental(): boolean {
      return read('incremental', this);
    },
    get fixedNodes(): boolean {
      return read('fixedNodes', this);
    },
    get selfLoops(): boolean {
      return read('selfLoops', this);
    },
  };
  if (shape === 'hidden-own') {
    for (const field of capabilityNames) Object.defineProperty(own, field, { enumerable: false });
  }
  supplied = shape === 'prototype' ? new Inherited() : own;
  return { supplied, counts, metadata, symbol };
}

function inputRequiringAllCapabilities() {
  const kernel = createCanvasKernel();
  const id = nodeId('fixed');
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id,
      type: 'task',
      position: { x: 0, y: 0 },
      size: { width: 0, height: 0 },
      data: null,
    });
    transaction.edges.add({
      id: edgeId('loop'),
      type: 'link',
      source: { nodeId: id, portId: '' },
      target: { nodeId: id, portId: '口' },
      data: null,
    });
  });
  return createLayoutInput(kernel.read(), { mode: 'incremental', fixedNodeIds: [id] });
}

for (const shape of shapes) {
  for (let mask = 0; mask < 8; mask += 1) {
    test(`owns all declared ${shape} Capability values for combination ${mask}`, async () => {
      const values = { incremental: (mask & 1) !== 0, fixedNodes: (mask & 2) !== 0, selfLoops: (mask & 4) !== 0 };
      const expected = { ...values };
      const source = suppliedCapabilities(shape, values);
      const originalPrototype = Object.getPrototypeOf(source.supplied);
      let capabilityReads = 0;
      let calls = 0;
      const config = { caller: Symbol('configuration') };
      const definition: LayoutEngineDefinition<typeof config> = {
        id: 'owned-capabilities',
        get capabilities() {
          capabilityReads += 1;
          expect(this).toBe(definition);
          return source.supplied;
        },
        compute(input, received) {
          calls += 1;
          expect(received).toBe(config);
          return {
            sourceRevision: input.revision,
            positions: input.nodes.map((node) => ({ id: node.id, position: node.position })),
          };
        },
      };
      const engine = defineLayoutEngine(definition);
      expect(engine.capabilities).toMatchObject(expected);
      expect(source.counts).toEqual({ incremental: 1, fixedNodes: 1, selfLoops: 1 });
      expect(capabilityReads).toBe(1);
      expect(Object.isFrozen(engine.capabilities)).toBe(true);
      expect(Object.isFrozen(source.supplied)).toBe(false);
      expect(Object.getPrototypeOf(source.supplied)).toBe(originalPrototype);
      expect(Reflect.get(engine.capabilities, 'metadata')).toBe(source.metadata);
      expect(Reflect.get(engine.capabilities, source.symbol)).toBe(source.metadata);
      expect(Object.isFrozen(source.metadata)).toBe(false);

      values.incremental = !values.incremental;
      values.fixedNodes = !values.fixedNodes;
      values.selfLoops = !values.selfLoops;
      const input = inputRequiringAllCapabilities();
      const computation = engine.compute(input, config, { signal: new AbortController().signal });
      const unsupported = capabilityNames.find((field) => !expected[field]);
      if (unsupported) {
        await expect(computation).rejects.toMatchObject({
          code: 'UNSUPPORTED_FEATURE',
          details: { feature: unsupported, providerId: 'owned-capabilities' },
        });
        expect(calls).toBe(0);
      } else {
        await expect(computation).resolves.toMatchObject({ sourceRevision: input.revision });
        expect(calls).toBe(1);
      }
      expect(engine.capabilities).toMatchObject(expected);
      expect(source.counts).toEqual({ incremental: 1, fixedNodes: 1, selfLoops: 1 });
      expect(capabilityReads).toBe(1);
    });
  }
}

const failures: unknown[] = [undefined, null, false, 0, '', Symbol('read failed')];
for (const shape of shapes) {
  for (const field of capabilityNames) {
    for (const [index, reason] of failures.entries()) {
      test(`preserves ${shape} ${field} read failure ${index}`, () => {
        const values = { incremental: true, fixedNodes: true, selfLoops: true };
        const source = suppliedCapabilities(shape, values, { field, reason });
        expectThrownValue(
          () =>
            defineLayoutEngine({
              id: 'failing-capability',
              capabilities: source.supplied,
              compute: (input) => ({ sourceRevision: input.revision, positions: [] }),
            }),
          reason,
        );
        expect(source.counts[field]).toBe(1);
        expect(Object.isFrozen(source.supplied)).toBe(false);
      });
    }
  }
}

test('preserves own enumerable copying order before materializing non-enumerable flags', () => {
  const first = new Error('own enumerable first');
  const later = new Error('hidden flag later');
  const reads: string[] = [];
  const supplied: LayoutCapabilities = {
    get selfLoops(): boolean {
      reads.push('selfLoops');
      throw first;
    },
    get incremental(): boolean {
      reads.push('incremental');
      throw later;
    },
    fixedNodes: true,
  };
  Object.defineProperty(supplied, 'incremental', { enumerable: false });
  expectThrownValue(
    () =>
      defineLayoutEngine({
        id: 'read-order',
        capabilities: supplied,
        compute: (input) => ({ sourceRevision: input.revision, positions: [] }),
      }),
    first,
  );
  expect(reads).toEqual(['selfLoops']);
});

test('preserves a capability-source getter failure without converting it to a Layout error', () => {
  const original = new Error('source failed');
  let reads = 0;
  const definition: LayoutEngineDefinition<void> = {
    id: 'source-failure',
    get capabilities(): LayoutCapabilities {
      expect(this).toBe(definition);
      reads += 1;
      throw original;
    },
    compute: (input) => ({ sourceRevision: input.revision, positions: [] }),
  };
  expectThrownValue(() => defineLayoutEngine(definition), original);
  expect(reads).toBe(1);
});
