import { expect, test } from 'bun:test';
import { createCanvasKernel, nodeId } from '@nodebraid/kernel';
import { createLayoutInput, type LayoutInputOptions } from '../src';

const id = nodeId('a');
function createView() {
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
  return kernel.read();
}

test('Layout Input retains the Request mode accepted during validation', () => {
  let reads = 0;
  const input = createLayoutInput(createView(), {
    get mode() {
      return ++reads <= 2 ? 'full' : ('invalid' as LayoutInputOptions['mode']);
    },
    fixedNodeIds: [],
  });
  expect(input.mode).toBe('full');
  expect(reads).toBe(1);
  expect(Object.isFrozen(input)).toBeTrue();
});

test('Layout Input retains an accepted incremental Request mode', () => {
  let reads = 0;
  const input = createLayoutInput(createView(), {
    get mode() {
      return ++reads <= 3 ? 'incremental' : ('invalid' as LayoutInputOptions['mode']);
    },
    fixedNodeIds: [],
  });
  expect(input.mode).toBe('incremental');
  expect(reads).toBe(1);
});

test.each([
  { value: 'wrong', details: { issue: 'INVALID_MODE', mode: 'wrong' } },
  { value: null, details: { issue: 'INVALID_MODE', receivedType: 'null' } },
  { value: 42, details: { issue: 'INVALID_MODE', receivedType: 'number' } },
  { value: { privateValue: 'must-not-escape' }, details: { issue: 'INVALID_MODE', receivedType: 'object' } },
])('Layout rejects the first invalid mode with bounded details: %p', ({ value, details }) => {
  let reads = 0,
    received: unknown;
  try {
    createLayoutInput(createView(), {
      get mode() {
        return (++reads === 1 ? value : 'full') as LayoutInputOptions['mode'];
      },
      fixedNodeIds: [],
    });
  } catch (error) {
    received = error;
  }
  expect(received).toMatchObject({ code: 'INVALID_REQUEST', details });
  expect(reads).toBe(1);
  expect(JSON.stringify(received)).not.toContain('must-not-escape');
});

test('Layout preserves the original mode read failure before Fixed Node processing', () => {
  const failure = new Error('original mode read failed');
  let fixedReads = 0,
    received: unknown;
  try {
    createLayoutInput(createView(), {
      get mode(): never {
        throw failure;
      },
      get fixedNodeIds() {
        fixedReads += 1;
        return [];
      },
    });
  } catch (error) {
    received = error;
  }
  expect(received).toBe(failure);
  expect(fixedReads).toBe(0);
});

test('Layout rejects an invalid mode before later Fixed Node read failures', () => {
  const failure = new Error('later Fixed Node read must not replace validation');
  let fixedReads = 0,
    received: unknown;
  try {
    createLayoutInput(createView(), {
      mode: 'wrong' as LayoutInputOptions['mode'],
      get fixedNodeIds(): never {
        fixedReads += 1;
        throw failure;
      },
    });
  } catch (error) {
    received = error;
  }
  expect(received).toMatchObject({ code: 'INVALID_REQUEST', details: { issue: 'INVALID_MODE', mode: 'wrong' } });
  expect(fixedReads).toBe(0);
});

test('Fixed Node resolution cannot replace the Request mode already accepted', () => {
  const options = {
    mode: 'full' as const,
    get fixedNodeIds() {
      Reflect.set(options, 'mode', 'invalid');
      return [id];
    },
  };
  const input = createLayoutInput(createView(), options);
  expect(input.mode).toBe('full');
  expect(input.nodes[0]?.fixed).toBeTrue();
  expect(options.mode as string).toBe('invalid');
});

test('Layout preserves a Fixed Node iterator failure after one mode capture', () => {
  const failure = new Error('original Fixed Node traversal failure');
  const ids = [id];
  Object.defineProperty(ids, Symbol.iterator, {
    get() {
      throw failure;
    },
  });
  let modeReads = 0,
    received: unknown;
  try {
    createLayoutInput(createView(), {
      get mode(): LayoutInputOptions['mode'] {
        modeReads += 1;
        return 'full';
      },
      fixedNodeIds: ids,
    });
  } catch (error) {
    received = error;
  }
  expect(received).toBe(failure);
  expect(modeReads).toBe(1);
});
