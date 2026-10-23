import { expect, test } from 'bun:test';
import { createCanvasKernel, nodeId, KernelError, type CanvasNode, type TransactionContext } from '../src';
const writers = ['add', 'replace'] as const;
const fields = ['position', 'size', 'parentId'] as const;
const target = nodeId('target');
const missing = nodeId('missing-parent');
function write(tx: TransactionContext, node: CanvasNode, writer: (typeof writers)[number]): void {
  if (writer === 'add') tx.nodes.add(node);
  else tx.nodes.replace(target, node);
}
for (const writer of writers) {
  test.each([...fields])(`Node ${writer} retains first invalid %s for final graph validation`, (field) => {
    const kernel = createCanvasKernel();
    if (writer === 'replace')
      kernel.transact((tx) => tx.nodes.add({ id: target, type: 'task', position: { x: 0, y: 0 }, data: null }));
    const before = kernel.read();
    let reads = 0;
    const input: CanvasNode = { id: target, type: 'task', position: { x: 10, y: 20 }, data: null };
    const invalid =
      field === 'position' ? { x: 10, y: Number.NaN } : field === 'size' ? { width: 40, height: -1 } : missing;
    const later = field === 'position' ? { x: 20, y: 30 } : field === 'size' ? { width: 50, height: 60 } : undefined;
    Object.defineProperty(input, field, {
      get(this: CanvasNode) {
        reads += 1;
        return reads === 1 ? invalid : later;
      },
    });
    let completed = false;
    let received: unknown;
    try {
      kernel.transact((tx) => {
        write(tx, input, writer);
        completed = true;
      });
    } catch (error) {
      received = error;
    }
    expect(completed).toBeTrue();
    expect(received).toBeInstanceOf(KernelError);
    expect(received).toMatchObject({
      code: 'INVALID_GRAPH',
      details: {
        issues: [
          { code: field === 'position' ? 'INVALID_POSITION' : field === 'size' ? 'INVALID_SIZE' : 'MISSING_PARENT' },
        ],
      },
    });
    expect(kernel.read()).toBe(before);
    expect(reads).toBe(1);
  });
}

const parent = nodeId('parent');
const continued = nodeId('continued');
const propertyKinds = ['enumerable', 'non-enumerable', 'inherited'] as const;
function setup(writer: (typeof writers)[number]) {
  const kernel = createCanvasKernel();
  kernel.transact((tx) => {
    tx.nodes.add({ id: parent, type: 'group', position: { x: 0, y: 0 }, data: null });
    if (writer === 'replace')
      tx.nodes.add({ id: target, type: 'task', parentId: parent, position: { x: 0, y: 0 }, data: 'old' });
  });
  return kernel;
}
for (const writer of writers) {
  for (const field of fields) {
    test.each([...propertyKinds])(`Node ${writer} copies first valid ${field} from %s without later reads`, (kind) => {
      const kernel = setup(writer);
      let reads = 0;
      const data = { label: 'opaque' };
      const first = field === 'position' ? { x: 12, y: 34 } : field === 'size' ? { width: 56, height: 78 } : parent;
      const input: CanvasNode = { id: target, type: 'task', position: { x: 10, y: 20 }, data };
      const descriptor = {
        enumerable: kind === 'enumerable',
        get(this: CanvasNode) {
          expect(this).toBe(input);
          reads += 1;
          if (reads > 1) throw new Error('An owned field must not be read a second time.');
          return first;
        },
      };
      if (kind === 'inherited') {
        Reflect.deleteProperty(input, field);
        Object.setPrototypeOf(input, Object.defineProperty({}, field, descriptor));
      } else Object.defineProperty(input, field, descriptor);
      const commit = kernel.transact((tx) => {
        write(tx, input, writer);
        if (typeof first === 'object') Reflect.set(first, field === 'position' ? 'x' : 'width', 999);
      });
      expect(commit).not.toBeNull();
      const saved = kernel.read().query.getNode(target)!;
      expect(reads).toBe(1);
      expect(saved.data).toBe(data);
      expect(Object.isFrozen(data)).toBeFalse();
      expect(Object.isFrozen(saved)).toBeTrue();
      expect(Object.isFrozen(saved.position)).toBeTrue();
      if (field === 'position') expect(saved.position).toEqual({ x: 12, y: 34 });
      else if (field === 'size') {
        expect(saved.size).toEqual({ width: 56, height: 78 });
        expect(Object.isFrozen(saved.size)).toBeTrue();
      } else expect(saved.parentId).toBe(parent);
    });
  }
  test.each(['size', 'parentId'] as ('size' | 'parentId')[])(
    `Node ${writer} retains absent %s without another read`,
    (field) => {
      const kernel = setup(writer);
      let reads = 0;
      const input: CanvasNode = { id: target, type: 'task', position: { x: 1, y: 2 }, data: null };
      Object.defineProperty(input, field, {
        get() {
          reads += 1;
          if (reads > 1) throw new Error('Absent value reread.');
          return undefined;
        },
      });
      kernel.transact((tx) => write(tx, input, writer));
      expect(reads).toBe(1);
      expect(Object.hasOwn(kernel.read().query.getNode(target)!, field)).toBeFalse();
    },
  );
}
const phases = [
  'type',
  'position',
  'position.x',
  'position.y',
  'size',
  'size.width',
  'size.height',
  'parentId',
  'data',
] as const;
type Phase = (typeof phases)[number];
function tracedNode(phase: Phase, failure: unknown, trace: Phase[]): CanvasNode {
  const read = <T>(name: Phase, value: T): T => {
    trace.push(name);
    if (name === phase) throw failure;
    return value;
  };
  return {
    id: target,
    get type() {
      return read('type', 'task');
    },
    get position() {
      return read('position', {
        get x() {
          return read('position.x', 1);
        },
        get y() {
          return read('position.y', 2);
        },
      });
    },
    get size() {
      return read('size', {
        get width() {
          return read('size.width', 20);
        },
        get height() {
          return read('size.height', 10);
        },
      });
    },
    get parentId() {
      return read('parentId', parent);
    },
    get data() {
      return read('data', { opaque: true });
    },
  };
}
function assertCaughtWrite(writer: (typeof writers)[number], phase: Phase, failure: unknown): void {
  const kernel = setup(writer),
    before = kernel.read(),
    trace: Phase[] = [];
  const old = before.query.getNode(target);
  const commit = kernel.transact((tx) => {
    let caught = false,
      received: unknown;
    try {
      write(tx, tracedNode(phase, failure, trace), writer);
    } catch (error) {
      caught = true;
      received = error;
    }
    expect(caught).toBeTrue();
    expect(received).toBe(failure);
    expect(trace).toEqual(phases.slice(0, phases.indexOf(phase) + 1));
    expect(tx.query.getNode(target)).toBe(old);
    expect(tx.query.getChildren(parent).map((n) => n.id)).toEqual(writer === 'replace' ? [target] : []);
    tx.nodes.add({ id: continued, type: 'task', position: { x: 3, y: 4 }, parentId: parent, data: null });
  });
  expect(commit).not.toBeNull();
  expect(commit!.changeSet.changes.map((change) => change.id)).toEqual([continued]);
  expect(before.query.getNode(continued)).toBeUndefined();
  expect(kernel.read().query.getNode(target)).toBe(old);
}
for (const writer of writers) {
  test.each([...phases])(`Node ${writer} preserves the original %s failure, order and caught Draft state`, (phase) => {
    assertCaughtWrite(writer, phase, new Error('Original ' + phase));
  });
  test.each([0, null, undefined, Symbol('original')])(
    `Node ${writer} preserves an opaque data thrown value %s`,
    (failure) => {
      assertCaughtWrite(writer, 'data', failure);
    },
  );
  test(`Node ${writer} keeps invalid geometry provisional until explicit later repair`, () => {
    const kernel = setup(writer);
    let reads = 0;
    const input: CanvasNode = {
      id: target,
      type: 'task',
      get position() {
        reads += 1;
        return reads === 1 ? { x: 1, y: Number.NaN } : { x: 9, y: 9 };
      },
      data: null,
    };
    const commit = kernel.transact((tx) => {
      write(tx, input, writer);
      expect(Number.isNaN(tx.query.getNode(target)!.position.y)).toBeTrue();
      tx.nodes.replace(target, { ...tx.query.getNode(target)!, position: { x: 1, y: 2 } });
    });
    expect(reads).toBe(1);
    expect(commit!.after.query.getNode(target)!.position).toEqual({ x: 1, y: 2 });
  });
}
