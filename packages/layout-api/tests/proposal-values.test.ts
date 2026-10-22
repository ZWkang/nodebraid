import { expect, test } from 'bun:test';
import { createCanvasKernel, nodeId } from '@nodebraid/kernel';
import { createLayoutInput, defineLayoutEngine, validateLayoutProposal } from '../src';

const id = nodeId('a');
function createInput(fixed = false) {
  const kernel = createCanvasKernel();
  kernel.transact((tx) =>
    tx.nodes.add({
      id,
      type: 'task',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      data: null,
    }),
  );
  return createLayoutInput(kernel.read(), { mode: 'full', fixedNodeIds: fixed ? [id] : [] });
}

test('Layout compute retains the finite coordinate accepted during validation', async () => {
  const input = createInput();
  let reads = 0;
  const engine = defineLayoutEngine({
    id: 'coordinate-values',
    capabilities: { incremental: false, fixedNodes: false, selfLoops: false },
    compute: () => ({
      sourceRevision: input.revision,
      positions: [
        {
          id,
          position: {
            get x() {
              return ++reads === 1 ? 10 : NaN;
            },
            y: 20,
          },
        },
      ],
    }),
  });
  const proposal = await engine.compute(input, {}, { signal: new AbortController().signal });
  expect(proposal.positions).toEqual([{ id, position: { x: 10, y: 20 } }]);
  expect(reads).toBe(1);
  expect(Object.isFrozen(proposal.positions[0]?.position)).toBeTrue();
});

test('Layout validation retains the source revision accepted before reading positions', () => {
  const input = createInput();
  let reads = 0;
  const proposal = validateLayoutProposal(input, {
    get sourceRevision() {
      return ++reads === 1 ? input.revision : input.revision + 10;
    },
    positions: [{ id, position: { x: 10, y: 20 } }],
  });
  expect(proposal.sourceRevision).toBe(input.revision);
  expect(reads).toBe(1);
});

test.each(['id', 'position', 'y'] as const)('Layout retains the accepted %s property', (field) => {
  const input = createInput();
  const result = { id, position: { x: 10, y: 20 } };
  const first = field === 'id' ? id : field === 'position' ? result.position : 20;
  let reads = 0;
  Object.defineProperty(field === 'y' ? result.position : result, field, {
    get() {
      return ++reads === 1
        ? first
        : field === 'id'
          ? nodeId('unknown')
          : field === 'position'
            ? { x: NaN, y: Infinity }
            : Infinity;
    },
  });
  const proposal = validateLayoutProposal(input, { sourceRevision: input.revision, positions: [result] });
  expect(proposal.positions).toEqual([{ id, position: { x: 10, y: 20 } }]);
  expect(reads).toBe(1);
});

test('Layout retains its accepted collection without another field read or iteration', () => {
  const input = createInput();
  const positions = [{ id, position: { x: 10, y: 20 } }];
  let fieldReads = 0,
    iterations = 0;
  Object.defineProperty(positions, Symbol.iterator, {
    value: function* () {
      if (++iterations === 1) yield positions[0]!;
    },
  });
  const proposal = validateLayoutProposal(input, {
    sourceRevision: input.revision,
    get positions() {
      fieldReads += 1;
      return positions;
    },
  });
  expect(proposal.positions).toEqual([{ id, position: { x: 10, y: 20 } }]);
  expect(fieldReads).toBe(1);
  expect(iterations).toBe(1);
  positions[0]!.position.x = 500;
  expect(proposal.positions[0]?.position).toEqual({ x: 10, y: 20 });
  expect(Object.isFrozen(proposal)).toBeTrue();
  expect(Object.isFrozen(proposal.positions)).toBeTrue();
});

test('Layout publishes the Fixed Node coordinates that passed validation', () => {
  const input = createInput(true);
  let reads = 0;
  const proposal = validateLayoutProposal(input, {
    sourceRevision: input.revision,
    positions: [
      {
        id,
        position: {
          get x() {
            return ++reads <= 2 ? 10 : 500;
          },
          y: 20,
        },
      },
    ],
  });
  expect(proposal.positions).toEqual([{ id, position: { x: 10, y: 20 } }]);
  expect(reads).toBe(1);
});

test.each(['revision', 'duplicate', 'unknown', 'x'] as const)(
  'Layout preserves %s validation precedence over later read errors',
  (mode) => {
    const input = createInput();
    const failure = new Error('later value must not be read');
    let laterReads = 0;
    const throwLater = (): never => {
      laterReads += 1;
      throw failure;
    };
    const valid = { id, position: { x: 10, y: 20 } };
    let proposal;
    if (mode === 'revision')
      proposal = {
        sourceRevision: 0,
        get positions(): never {
          return throwLater();
        },
      };
    else if (mode === 'x')
      proposal = {
        sourceRevision: input.revision,
        positions: [
          {
            id,
            position: {
              x: NaN,
              get y(): never {
                return throwLater();
              },
            },
          },
        ],
      };
    else
      proposal = {
        sourceRevision: input.revision,
        positions: [
          ...(mode === 'duplicate' ? [valid] : []),
          {
            id: mode === 'duplicate' ? id : nodeId('unknown'),
            get position(): never {
              return throwLater();
            },
          },
        ],
      };
    let received: unknown;
    try {
      validateLayoutProposal(input, proposal);
    } catch (error) {
      received = error;
    }
    expect(received).toMatchObject({
      code: 'INVALID_PROPOSAL',
      details: {
        issue:
          mode === 'revision'
            ? 'SOURCE_REVISION_MISMATCH'
            : mode === 'duplicate'
              ? 'DUPLICATE_NODE'
              : mode === 'unknown'
                ? 'UNKNOWN_NODE'
                : 'INVALID_POSITION',
      },
    });
    expect(laterReads).toBe(0);
  },
);

test.each(['collection', 'id', 'position', 'x', 'y'] as const)(
  'Layout propagates the original %s read failure',
  (field) => {
    const input = createInput(),
      failure = new Error('original Layout value read failure');
    const result = { id, position: { x: 10, y: 20 } };
    const proposal = { sourceRevision: input.revision, positions: [result] };
    const target = field === 'collection' ? proposal : field === 'x' || field === 'y' ? result.position : result;
    Object.defineProperty(target, field === 'collection' ? 'positions' : field, {
      get() {
        throw failure;
      },
    });
    let received: unknown;
    try {
      validateLayoutProposal(input, proposal);
    } catch (error) {
      received = error;
    }
    expect(received).toBe(failure);
  },
);
