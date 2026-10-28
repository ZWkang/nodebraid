import { createCanvasKernel, nodeId, edgeId } from '@nodebraid/kernel';
import type { InteractionProjection, NodeDragProjectionNode } from '@nodebraid/interaction-api';
import { RendererError } from '@nodebraid/renderer-api';
import { createSvgRenderer } from '../src';

type Shape = 'own' | 'inherited' | 'non-enumerable';
type Family = 'node-drag' | 'viewport-pan' | 'box-selection' | 'connection-preview';
type Mode = 'mutate' | 'throw' | 'metadata-throw' | 'invalid-first' | 'first-error-order';
interface Focus {
  readonly slot: string;
  readonly field: string;
}
interface Result {
  readonly id: string;
  readonly passed: boolean;
  readonly error?: string;
}
const slots: Readonly<Record<Family, readonly Focus[]>> = {
  'node-drag': [
    { slot: 'basePosition', field: 'x' },
    { slot: 'basePosition', field: 'y' },
    { slot: 'position', field: 'x' },
    { slot: 'position', field: 'y' },
  ],
  'viewport-pan': [
    { slot: 'baseViewport', field: 'x' },
    { slot: 'baseViewport', field: 'y' },
    { slot: 'baseViewport', field: 'zoom' },
    { slot: 'viewport', field: 'x' },
    { slot: 'viewport', field: 'y' },
    { slot: 'viewport', field: 'zoom' },
  ],
  'box-selection': ['x', 'y', 'width', 'height'].map((field) => ({ slot: 'rect', field })),
  'connection-preview': ['x', 'y'].map((field) => ({ slot: 'pointerWorldPoint', field })),
};
function check(value: boolean, message: string): asserts value {
  if (!value) throw new Error(message);
}
function equal(actual: unknown, expected: unknown, message: string): void {
  check(JSON.stringify(actual) === JSON.stringify(expected), message + ': ' + JSON.stringify(actual));
}
function attributes(target: SVGSVGElement, selector: string, keys: readonly string[]): Record<string, string | null> {
  const element = target.querySelector(selector);
  check(element !== null, 'Expected public SVG element ' + selector);
  return Object.fromEntries(keys.map((key) => [key, element.getAttribute(key)]));
}
async function geometryCase(family: Family, shape: Shape, focus: Focus, mode: Mode, original?: unknown): Promise<void> {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const renderer = createSvgRenderer({ target }),
    kernel = createCanvasKernel();
  const a = nodeId('a'),
    b = nodeId('b'),
    e = edgeId('edge');
  kernel.transact((tx) => {
    tx.nodes.add({ id: a, type: 'task', position: { x: 10, y: 20 }, size: { width: 80, height: 40 }, data: null });
    tx.nodes.add({ id: b, type: 'task', position: { x: 220, y: 40 }, size: { width: 100, height: 60 }, data: null });
    tx.edges.add({ id: e, type: 'link', source: { nodeId: a }, target: { nodeId: b }, data: null });
  });
  const view = kernel.read();
  const sources = new Map<string, object>(),
    reads = new Map<string, number>(),
    metadata = new Map<string, number>();
  const opaque = { caller: Symbol('metadata') };
  function geometry<T extends Record<string, number>>(slot: string, values: T): T {
    const descriptors: PropertyDescriptorMap = {};
    for (const field of Object.keys(values)) {
      descriptors[field] = {
        enumerable: shape === 'own',
        configurable: true,
        get(this: object): number {
          check(this === sources.get(slot), 'Geometry getter original receiver');
          const key = slot + '.' + field,
            count = (reads.get(key) ?? 0) + 1;
          reads.set(key, count);
          if (mode === 'first-error-order') {
            if (slot === focus.slot && field === focus.field) return Number.NaN;
            if (
              (family === 'node-drag' && slot === 'position' && field === 'y') ||
              (family !== 'node-drag' && slot === focus.slot && field === 'y')
            )
              throw original;
          }

          if (slot === focus.slot && field === focus.field) {
            if (mode === 'throw') throw original;
            if (mode === 'invalid-first') return count === 1 ? Number.NaN : Reflect.get(values, field);
            if (mode === 'mutate' && count > 1) return Number.NaN;
          }
          return Reflect.get(values, field);
        },
      };
    }
    const source: object =
      shape === 'inherited'
        ? Object.create(Object.defineProperties({}, descriptors))
        : Object.defineProperties({}, descriptors);
    sources.set(slot, source);
    Object.defineProperty(source, 'metadata', {
      enumerable: true,
      get(this: object) {
        check(this === source, 'Metadata getter original receiver');
        metadata.set(slot, (metadata.get(slot) ?? 0) + 1);
        if (mode === 'metadata-throw' && slot === focus.slot) throw original;
        return opaque;
      },
    });
    // Each declared key is installed by the descriptor loop; only the fixture changes its representation.
    return source as T;
  }
  let projection: InteractionProjection;
  switch (family) {
    case 'node-drag':
      projection = {
        type: family,
        nodes: [
          {
            nodeId: a,
            basePosition: geometry('basePosition', { x: 10, y: 20 }),
            position: geometry('position', { x: 80, y: 90 }),
          },
        ],
      };
      break;
    case 'viewport-pan':
      projection = {
        type: family,
        baseViewport: geometry('baseViewport', { x: 0, y: 0, zoom: 1 }),
        viewport: geometry('viewport', { x: 20, y: 30, zoom: 2 }),
      };
      break;
    case 'box-selection':
      projection = { type: family, rect: geometry('rect', { x: 5, y: 6, width: 70, height: 80 }) };
      break;
    case 'connection-preview':
      projection = {
        type: family,
        source: { nodeId: a, role: 'source' },
        pointerWorldPoint: geometry('pointerWorldPoint', { x: 330, y: 140 }),
        target: { type: 'none' },
      };
      break;
  }
  try {
    renderer.updateDocument({ type: 'reset', view });
    renderer.updateSession({ selection: { nodeIds: [a], edgeIds: [] }, viewport: { x: 0, y: 0, zoom: 1 } });
    const node = target.querySelector('[data-nodebraid-node-id="a"]');
    const documentDOM = target.innerHTML;
    renderer.updateInteraction({ type: 'box-selection', rect: { x: 2, y: 3, width: 20, height: 30 } });
    const previousDOM = target.innerHTML;
    let didThrow = false,
      caught: unknown;
    try {
      renderer.updateInteraction(projection);
    } catch (error) {
      didThrow = true;
      caught = error;
    }
    if (mode === 'mutate') {
      check(!didThrow, 'Valid captured geometry must project');
      for (const candidate of slots[family])
        check(reads.get(candidate.slot + '.' + candidate.field) === 1, 'Every declared coordinate read once');
      for (const [slot, source] of sources) {
        check(metadata.get(slot) === 1, 'Own enumerable metadata copied once');
        check(!Object.isFrozen(source), 'Caller geometry remains mutable');
        Object.defineProperty(source, 'callerMutation', { value: true });
      }
      check(!Object.isFrozen(opaque), 'Caller metadata remains shallow');
      switch (family) {
        case 'node-drag':
          equal(
            attributes(target, '[data-nodebraid-node-id="a"]', ['x', 'y']),
            { x: '80', y: '90' },
            'Captured Node position',
          );
          equal(
            attributes(target, '[data-nodebraid-edge-id="edge"]', ['x1', 'y1', 'x2', 'y2']),
            { x1: '120', y1: '110', x2: '270', y2: '70' },
            'Incident Edge follows captured position',
          );
          equal(
            renderer.hitTest({ x: 100, y: 100 }),
            { type: 'node', nodeId: a, worldPoint: { x: 100, y: 100 } },
            'Hit uses effective candidate geometry',
          );
          break;
        case 'viewport-pan':
          equal(
            attributes(target, '[data-nodebraid-renderer-svg-root]', ['transform']),
            { transform: 'matrix(2 0 0 2 20 30)' },
            'Captured Viewport transform',
          );
          equal(
            renderer.hitTest({ x: 120, y: 110 }),
            { type: 'node', nodeId: a, worldPoint: { x: 50, y: 40 } },
            'Hit uses effective candidate Viewport',
          );
          break;
        case 'box-selection':
          equal(
            attributes(target, '[data-nodebraid-box-selection]', ['x', 'y', 'width', 'height']),
            { x: '5', y: '6', width: '70', height: '80' },
            'Captured rectangle',
          );
          break;
        case 'connection-preview':
          equal(
            attributes(target, '[data-nodebraid-connection-preview]', ['x1', 'y1', 'x2', 'y2']),
            { x1: '90', y1: '40', x2: '330', y2: '140' },
            'Captured pointer endpoint',
          );
          break;
      }
      for (const candidate of slots[family])
        check(reads.get(candidate.slot + '.' + candidate.field) === 1, 'Hit does not re-read caller geometry');
    } else {
      check(didThrow, 'Invalid or throwing geometry must throw');
      if (mode === 'invalid-first' || (mode === 'first-error-order' && family !== 'node-drag')) {
        check(
          caught instanceof RendererError && caught.code === 'INVALID_INTERACTION_PROJECTION',
          'First invalid value remains rejected',
        );
        check(reads.get(focus.slot + '.' + focus.field) === 1, 'No retry of invalid first value');
      } else check(caught === original, 'Original thrown value identity');
      if (mode === 'first-error-order') {
        const later = family === 'node-drag' ? 'position.y' : focus.slot + '.y';
        check(
          (reads.get(later) ?? 0) === (family === 'node-drag' ? 1 : 0),
          'Original eager/sequential first-error prefix retained',
        );
      }
      check(target.innerHTML === previousDOM, 'Rejected replacement retains previous accepted DOM');
    }
    check(kernel.read() === view, 'Renderer cannot write the Kernel baseline');
    renderer.updateInteraction(null);
    check(target.innerHTML === documentDOM, 'Clear restores committed geometry and Session');
    check(
      target.querySelector('[data-nodebraid-node-id="a"]') === node,
      'Keyed Node identity survives replacement/clear',
    );
  } finally {
    await renderer.dispose();
    check(
      target.childElementCount === 0 && !target.hasAttribute('tabindex'),
      'Owned subtree and temporary tabindex removed',
    );
    target.remove();
  }
}
export async function runInteractionGeometryValueCases(): Promise<{
  controls: number;
  passed: number;
  results: Result[];
  nativeInputEventsDriven: 0;
}> {
  const results: Result[] = [];
  const run = async (id: string, execute: () => Promise<void>) => {
    try {
      await execute();
      results.push({ id, passed: true });
    } catch (error) {
      results.push({ id, passed: false, error: error instanceof Error ? error.stack : String(error) });
    }
  };
  const failures: unknown[] = [undefined, null, false, 0, '', Symbol('geometry-read'), new Error('same identity')];
  for (const family of Object.keys(slots) as Family[]) {
    for (const focus of slots[family]) {
      for (const shape of ['own', 'inherited', 'non-enumerable'] as const) {
        await run('captured/' + family + '/' + focus.slot + '.' + focus.field + '/' + shape, () =>
          geometryCase(family, shape, focus, 'mutate'),
        );
      }
      for (const [index, original] of failures.entries()) {
        await run('raw-error/' + family + '/' + focus.slot + '.' + focus.field + '/' + index, () =>
          geometryCase(family, 'own', focus, 'throw', original),
        );
      }
      await run('invalid-first/' + family + '/' + focus.slot + '.' + focus.field, () =>
        geometryCase(family, 'inherited', focus, 'invalid-first'),
      );
    }
    await run('first-error-order/' + family, () =>
      geometryCase(family, 'own', slots[family][0]!, 'first-error-order', new Error('later coordinate')),
    );
    for (const [index, original] of failures.entries()) {
      const focus = slots[family][0]!;
      await run('metadata-error/' + family + '/' + index, () =>
        geometryCase(family, 'own', focus, 'metadata-throw', original),
      );
    }
  }
  results.push(...(await runInteractionGeometryArrayCases()).results);
  results.push(...(await runInteractionGeometryMetadataCases()).results);
  return {
    controls: results.length,
    passed: results.filter((result) => result.passed).length,
    results,
    nativeInputEventsDriven: 0,
  };
}

async function geometryArrayCase(cloneIterator: boolean): Promise<void> {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '600');
  target.setAttribute('height', '400');
  document.body.append(target);
  const renderer = createSvgRenderer({ target }),
    kernel = createCanvasKernel();
  const a = nodeId('a'),
    b = nodeId('b');
  kernel.transact((tx) => {
    tx.nodes.add({ id: a, type: 'task', position: { x: 10, y: 20 }, size: { width: 80, height: 40 }, data: null });
    tx.nodes.add({ id: b, type: 'task', position: { x: 220, y: 40 }, size: { width: 100, height: 60 }, data: null });
  });
  const nodes: NodeDragProjectionNode[] = [
    { nodeId: a, basePosition: { x: 10, y: 20 }, position: { x: 80, y: 90 } },
    { nodeId: b, basePosition: { x: 220, y: 40 }, position: { x: 280, y: 190 } },
  ];
  nodes.map = function <U>(
    callback: (value: NodeDragProjectionNode, index: number, array: NodeDragProjectionNode[]) => U,
    thisArg?: unknown,
  ): U[] {
    const result: U[] = [];
    for (let index = 0; index < this.length; index += 1)
      result.push(callback.call(thisArg, this[index]!, 1 - index, this));
    return result;
  };
  if (cloneIterator)
    nodes[Symbol.iterator] = function () {
      return [{ ...this[0]! }, { ...this[1]! }].values();
    };
  try {
    const view = kernel.read();
    renderer.updateDocument({ type: 'reset', view });
    renderer.updateSession({ selection: { nodeIds: [], edgeIds: [] }, viewport: { x: 0, y: 0, zoom: 1 } });
    const before = target.innerHTML,
      nodeA = target.querySelector('[data-nodebraid-node-id="a"]'),
      nodeB = target.querySelector('[data-nodebraid-node-id="b"]');
    renderer.updateInteraction({ type: 'node-drag', nodes });
    equal(
      attributes(target, '[data-nodebraid-node-id="a"]', ['x', 'y']),
      { x: '80', y: '90' },
      'Node a keeps its validated candidate',
    );
    equal(
      attributes(target, '[data-nodebraid-node-id="b"]', ['x', 'y']),
      { x: '280', y: '190' },
      'Node b keeps its validated candidate',
    );
    equal(
      renderer.hitTest({ x: 100, y: 100 }),
      { type: 'node', nodeId: a, worldPoint: { x: 100, y: 100 } },
      'Candidate a hit',
    );
    equal(
      renderer.hitTest({ x: 310, y: 210 }),
      { type: 'node', nodeId: b, worldPoint: { x: 310, y: 210 } },
      'Candidate b hit',
    );
    check(kernel.read() === view, 'Array projection leaves Kernel unchanged');
    renderer.updateInteraction(null);
    check(target.innerHTML === before, 'Array projection clear restores baseline');
    check(
      target.querySelector('[data-nodebraid-node-id="a"]') === nodeA &&
        target.querySelector('[data-nodebraid-node-id="b"]') === nodeB,
      'Both keyed Node elements survive',
    );
  } finally {
    await renderer.dispose();
    check(target.childElementCount === 0 && !target.hasAttribute('tabindex'), 'Array case cleanup');
    target.remove();
  }
}
export async function runInteractionGeometryArrayCases(): Promise<{
  controls: number;
  passed: number;
  results: Result[];
}> {
  const results: Result[] = [];
  for (const clone of [false, true]) {
    const id = 'candidate-node-key/' + clone;
    try {
      await geometryArrayCase(clone);
      results.push({ id, passed: true });
    } catch (error) {
      results.push({ id, passed: false, error: error instanceof Error ? error.stack : String(error) });
    }
  }
  return { controls: results.length, passed: results.filter((result) => result.passed).length, results };
}

async function geometryMetadataCase(
  slot: 'basePosition' | 'position',
  mode: 'raw-throws' | 'clone-throws',
): Promise<void> {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  target.setAttribute('width', '400');
  target.setAttribute('height', '300');
  document.body.append(target);
  const renderer = createSvgRenderer({ target }),
    kernel = createCanvasKernel(),
    id = nodeId('a');
  kernel.transact((tx) =>
    tx.nodes.add({ id, type: 'task', position: { x: 10, y: 20 }, size: { width: 80, height: 40 }, data: null }),
  );
  const original = new Error(slot + '/' + mode),
    opaque = { caller: Symbol(mode) };
  let rawReads = 0,
    cloneReads = 0;
  const rawPoint = { x: slot === 'basePosition' ? 10 : 80, y: slot === 'basePosition' ? 20 : 90 };
  Object.defineProperty(rawPoint, 'metadata', {
    enumerable: true,
    get(this: object) {
      check(this === rawPoint, 'Original map Point metadata receiver');
      rawReads += 1;
      if (mode === 'raw-throws') throw original;
      return opaque;
    },
  });
  const clonePoint = { x: rawPoint.x, y: rawPoint.y };
  Object.defineProperty(clonePoint, 'metadata', {
    enumerable: true,
    get() {
      cloneReads += 1;
      if (mode === 'clone-throws') throw original;
      return opaque;
    },
  });
  const candidate: NodeDragProjectionNode = {
    nodeId: id,
    basePosition: slot === 'basePosition' ? rawPoint : { x: 10, y: 20 },
    position: slot === 'position' ? rawPoint : { x: 80, y: 90 },
  };
  const clone: NodeDragProjectionNode = { ...candidate, [slot]: clonePoint };
  const nodes: NodeDragProjectionNode[] = [candidate];
  nodes[Symbol.iterator] = function () {
    return [clone].values();
  };
  try {
    const view = kernel.read();
    renderer.updateDocument({ type: 'reset', view });
    renderer.updateSession({ selection: { nodeIds: [], edgeIds: [] }, viewport: { x: 0, y: 0, zoom: 1 } });
    const documentDOM = target.innerHTML;
    renderer.updateInteraction({ type: 'box-selection', rect: { x: 2, y: 3, width: 20, height: 30 } });
    const previousDOM = target.innerHTML;
    let didThrow = false,
      caught: unknown;
    try {
      renderer.updateInteraction({ type: 'node-drag', nodes });
    } catch (error) {
      didThrow = true;
      caught = error;
    }
    check(rawReads === 1 && cloneReads === 0, 'Copy stage reads original map metadata, not validation iterator clone');
    if (mode === 'raw-throws') {
      check(didThrow && caught === original, 'Original map metadata error identity retained');
      check(target.innerHTML === previousDOM, 'Metadata error preserves accepted DOM');
    } else {
      check(!didThrow, 'Uncopied iterator metadata cannot introduce an error');
      equal(
        attributes(target, '[data-nodebraid-node-id="a"]', ['x', 'y']),
        { x: '80', y: '90' },
        'Captured numeric geometry still projects',
      );
    }
    check(kernel.read() === view && !Object.isFrozen(opaque), 'Kernel baseline and shallow caller metadata retained');
    renderer.updateInteraction(null);
    check(target.innerHTML === documentDOM, 'Metadata case clears to committed DOM');
  } finally {
    await renderer.dispose();
    check(target.childElementCount === 0 && !target.hasAttribute('tabindex'), 'Metadata case cleanup');
    target.remove();
  }
}
export async function runInteractionGeometryMetadataCases(): Promise<{
  controls: number;
  passed: number;
  results: Result[];
}> {
  const results: Result[] = [];
  for (const slot of ['basePosition', 'position'] as const)
    for (const mode of ['raw-throws', 'clone-throws'] as const) {
      const id = 'copy-stage-metadata/' + slot + '/' + mode;
      try {
        await geometryMetadataCase(slot, mode);
        results.push({ id, passed: true });
      } catch (error) {
        results.push({ id, passed: false, error: error instanceof Error ? error.stack : String(error) });
      }
    }
  return { controls: results.length, passed: results.filter((result) => result.passed).length, results };
}
