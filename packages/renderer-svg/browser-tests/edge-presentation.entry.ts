import {
  createCanvasKernel,
  edgeId,
  nodeId,
  type CanvasCommit,
  type CanvasEdge,
  type CanvasKernel,
} from '@nodebraid/kernel';
import type { PortDefinition } from '@nodebraid/port-api';
import type { CanvasRenderer } from '@nodebraid/renderer-api';

import { createSvgRenderer, type SvgEdgePath, type SvgEdgePresentation, type SvgRendererConfig } from '../src';

const namespace = 'http://www.w3.org/2000/svg';
const sourceId = nodeId('edge-source');
const targetId = nodeId('edge-target');
const readableId = edgeId('readable-edge');
type PathKind = SvgEdgePath;
type Presentation = SvgEdgePresentation;
type Fixture = { target: SVGSVGElement; kernel: CanvasKernel; renderer: CanvasRenderer };

function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

async function withFixture(
  kind: PathKind,
  run: (fixture: Fixture) => void,
  resolve: (edge: Readonly<CanvasEdge>) => Presentation = (edge) => ({ path: kind, label: String(edge.data) }),
): Promise<void> {
  const target = document.createElementNS(namespace, 'svg');
  target.setAttribute('width', '600');
  target.setAttribute('height', '400');
  document.body.append(target);
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => {
    transaction.nodes.add({
      id: sourceId,
      type: 'step',
      position: { x: 20, y: 30 },
      size: { width: 80, height: 60 },
      data: null,
    });
    transaction.nodes.add({
      id: targetId,
      type: 'step',
      position: { x: 300, y: 150 },
      size: { width: 80, height: 60 },
      data: null,
    });
    transaction.edges.add({
      id: readableId,
      type: kind,
      source: { nodeId: sourceId },
      target: { nodeId: targetId },
      data: '<b>Approve & continue</b>',
    });
  });
  const config: SvgRendererConfig = {
    target,
    edges: {
      resolve,
      previewPath: kind,
    },
  };
  let renderer: ReturnType<typeof createSvgRenderer> | undefined;
  try {
    renderer = createSvgRenderer(config);
    renderer.updateDocument({ type: 'reset', view: kernel.read() });
    renderer.updateSession({ selection: { nodeIds: [], edgeIds: [] }, viewport: { x: 0, y: 0, zoom: 1 } });
    run({ target, kernel, renderer });
  } finally {
    await renderer?.dispose();
    target.remove();
  }
}

function edgeElement(target: SVGSVGElement, id = readableId): SVGGElement {
  const edge = target.querySelector<SVGGElement>('[data-nodebraid-edge-id="' + id + '"]');
  check(edge?.localName === 'g', 'Readable Edge must have one stable semantic group.');
  return edge;
}

function edgePath(target: SVGSVGElement, id = readableId): SVGPathElement {
  const path = edgeElement(target, id).querySelector<SVGPathElement>('[data-nodebraid-edge-path]');
  check(path, 'Expected the public Edge path.');
  return path;
}

function replaceEdge(kernel: CanvasKernel, changes: Partial<CanvasEdge>): CanvasCommit {
  const commit = kernel.transact((transaction) => {
    const edge = transaction.query.getEdge(readableId);
    check(edge, 'Expected the readable source Edge.');
    transaction.edges.replace(edge.id, { ...edge, ...changes });
  });
  check(commit, 'Expected a changed Edge Commit.');
  return commit;
}

function thrownBy(run: () => void): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the public operation to fail.');
}

function assertPathHit(renderer: CanvasRenderer, path: SVGPathElement, zoom = 1, x = 0, y = 0) {
  const point = path.getPointAtLength(path.getTotalLength() / 2);
  const hit = renderer.hitTest({ x: point.x * zoom + x, y: point.y * zoom + y });
  check(hit?.type === 'edge' && hit.edgeId === readableId, 'Hit Test must follow the visible path.');
}

async function acceptedPresentationAndFailures() {
  const accepted: { path: SvgEdgePath; label: string } = { path: 'orthogonal', label: 'Accepted label' };
  let output: unknown = accepted;
  let failure: Error | undefined;
  await withFixture(
    'orthogonal',
    ({ target, kernel, renderer }) => {
      const edge = edgeElement(target);
      const initialPath = edgePath(target).getAttribute('d');
      accepted.path = 'bezier';
      accepted.label = 'Changed outside the Renderer';
      failure = new Error('Derived state must not rerun application projection.');
      renderer.updateSession({
        selection: { nodeIds: [], edgeIds: [readableId] },
        viewport: { x: 5, y: 7, zoom: 1.2 },
      });
      assertPathHit(renderer, edgePath(target), 1.2, 5, 7);
      renderer.updateInteraction({
        type: 'node-drag',
        nodes: [{ nodeId: sourceId, basePosition: { x: 20, y: 30 }, position: { x: 70, y: 90 } }],
      });
      check(edgePath(target).getAttribute('d') !== initialPath, 'Node Drag must update the visible Edge path.');
      assertPathHit(renderer, edgePath(target), 1.2, 5, 7);
      renderer.updateInteraction(null);
      check(
        edgePath(target).getAttribute('d') === initialPath,
        'Clearing drag must restore the accepted Edge geometry.',
      );
      renderer.updateInteraction({
        type: 'viewport-pan',
        baseViewport: { x: 5, y: 7, zoom: 1.2 },
        viewport: { x: 25, y: 17, zoom: 1.2 },
      });
      assertPathHit(renderer, edgePath(target), 1.2, 25, 17);
      renderer.updateInteraction(null);
      check(
        edgePath(target).getAttribute('data-nodebraid-edge-path') === 'orthogonal',
        'Accepted presentation must capture path choice.',
      );
      check(
        edge.querySelector('[data-nodebraid-edge-label]')?.textContent === 'Accepted label',
        'Accepted label must not follow external mutation.',
      );
      check(
        edgeElement(target) === edge && edge.getAttribute('data-nodebraid-selected') === 'true',
        'Derived updates must preserve Edge identity and Selection.',
      );
      check(kernel.read().snapshot.revision === 1, 'Derived updates must not create Document commits.');

      failure = undefined;
      output = { path: 'bezier', label: 'Committed label' };
      renderer.updateDocument({ type: 'commit', commit: replaceEdge(kernel, { data: 'new data' }) });
      check(edgeElement(target) === edge, 'Path kind changes must preserve semantic Edge identity.');
      check(
        edgePath(target).getAttribute('data-nodebraid-edge-path') === 'bezier',
        'A committed application projection must change the path kind.',
      );
      check(
        edge.querySelector('[data-nodebraid-edge-label]')?.textContent === 'Committed label',
        'Committed data must refresh its label.',
      );

      const before = target.innerHTML;
      const rejected = replaceEdge(kernel, { data: 'candidate data' });
      const originalFailure = new Error('application projection failed');
      failure = originalFailure;
      check(
        thrownBy(() => renderer.updateDocument({ type: 'commit', commit: rejected })) === originalFailure,
        'Original application exceptions must retain identity.',
      );
      check(target.innerHTML === before, 'Application failure must preserve all accepted DOM.');
      assertPathHit(renderer, edgePath(target), 1.2, 5, 7);
      failure = undefined;
      for (output of [
        null,
        [],
        {},
        { path: 'unsupported' },
        { path: 'orthogonal', label: 42 },
        { path: 'orthogonal', extra: true },
      ]) {
        const invalid = thrownBy(() => renderer.updateDocument({ type: 'commit', commit: rejected }));
        check(
          invalid instanceof Error && 'code' in invalid && invalid.code === 'INVALID_EDGE_PRESENTATION',
          'Invalid presentation must fail with the public error code.',
        );
        check(target.innerHTML === before, 'Invalid presentation must preserve accepted DOM and geometry.');
      }
      output = { path: 'orthogonal' };
      renderer.updateDocument({ type: 'commit', commit: rejected });
      check(
        edgeElement(target) === edge && !edge.querySelector('[data-nodebraid-edge-label]'),
        'Retrying the same commit must work and remove an absent label.',
      );
    },
    () => {
      if (failure) throw failure;
      return output as Presentation;
    },
  );
}

async function parallelEdgesAndReflow(kind: PathKind) {
  await withFixture(kind, ({ target, kernel, renderer }) => {
    const original = edgeElement(target);
    const ids = [edgeId('parallel-a'), readableId, edgeId('parallel-z')];
    const commit = kernel.transact((transaction) => {
      const source = transaction.query.getEdge(readableId);
      check(source, 'Expected the original Edge for the parallel group.');
      for (const id of [ids[0]!, ids[2]!]) transaction.edges.add({ ...source, id });
    });
    check(commit, 'Adding parallel Edges must commit.');
    renderer.updateDocument({ type: 'commit', commit });
    const paths = ids.map((id) => edgePath(target, id));
    check(
      new Set(paths.map((path) => path.getAttribute('d'))).size === ids.length,
      'Parallel Edges must occupy distinguishable paths.',
    );
    const divided = paths.map((path) => path.getAttribute('d'));
    renderer.updateSession({ selection: { nodeIds: [], edgeIds: [] }, viewport: { x: 0, y: 0, zoom: 0.1 } });
    for (const [index, path] of paths.entries()) {
      const point = path.getPointAtLength(path.getTotalLength() / 2);
      const hit = renderer.hitTest({ x: point.x * 0.1, y: point.y * 0.1 });
      check(
        hit?.type === 'edge' && hit.edgeId === ids[index],
        'At small zoom, each parallel Edge must win at its own path instead of the topmost tolerance match.',
      );
    }
    if (kind === 'orthogonal') {
      const first = paths[0]!.getPointAtLength(paths[0]!.getTotalLength() / 2);
      const second = paths[2]!.getPointAtLength(paths[2]!.getTotalLength() / 2);
      const equal = renderer.hitTest({ x: (first.x + second.x) * 0.05, y: (first.y + second.y) * 0.05 });
      check(
        equal?.type === 'edge' && equal.edgeId === 'parallel-z',
        'Equal-distance paths must use canonical topmost Edge order.',
      );
    }
    const removed = kernel.transact((transaction) => transaction.edges.remove(ids[0]!));
    check(removed, 'Removing one parallel Edge must commit.');
    renderer.updateDocument({ type: 'commit', commit: removed });
    check(
      !target.querySelector('[data-nodebraid-edge-id="parallel-a"]'),
      'Removed parallel Edge must leave the projection.',
    );
    check(edgeElement(target) === original, 'Reflow must preserve surviving Edge identity.');
    const undo = kernel.transact((transaction) => transaction.applyChangeSet(removed.changeSet, 'reverse'));
    check(undo, 'Reversing removal must produce a real Commit.');
    renderer.updateDocument({ type: 'commit', commit: undo });
    check(
      ids.every((id, index) => edgePath(target, id).getAttribute('d') === divided[index]),
      'Restoring the same parallel set must restore its deterministic routing.',
    );
    const redo = kernel.transact((transaction) => transaction.applyChangeSet(removed.changeSet, 'forward'));
    check(redo, 'Reapplying removal must produce a real Commit.');
    renderer.updateDocument({ type: 'commit', commit: redo });
    check(target.querySelectorAll('[data-nodebraid-edge-id]').length === 2, 'Redo must remove only its target Edge.');
  });
}

async function orthogonalParallelNarrowGap() {
  const failures: string[] = [];
  for (const targetY of [150, 30]) {
    for (const count of [2, 3]) {
      await withFixture('orthogonal', ({ target, kernel, renderer }) => {
        const ids = [readableId, edgeId('parallel-gap-a'), edgeId('parallel-gap-b')].slice(0, count);
        const commit = kernel.transact((transaction) => {
          const node = transaction.query.getNode(targetId);
          const edge = transaction.query.getEdge(readableId);
          check(node && edge, 'Expected the narrow-gap graph fixture.');
          transaction.nodes.replace(targetId, { ...node, position: { x: 148, y: targetY } });
          for (const id of ids.slice(1)) transaction.edges.add({ ...edge, id });
        });
        check(commit, 'Creating narrow-gap parallel Edges must commit.');
        renderer.updateDocument({ type: 'commit', commit });
        // Keep detours above the Nodes inside the visible Target as well.
        const viewport = { x: 100, y: 100, zoom: 1 };
        renderer.updateSession({ selection: { nodeIds: [], edgeIds: [] }, viewport });
        for (const id of ids) {
          const path = edgePath(target, id);
          const length = path.getTotalLength();
          check(Number.isFinite(length) && length > 0, 'Parallel Edge must expose a finite visible path.');
          let independentlyHittable = false;
          const observed = new Set<string>();
          for (let distance = 0; distance <= length; distance += 1) {
            const point = path.getPointAtLength(distance);
            const screen = { x: point.x + viewport.x, y: point.y + viewport.y };
            if (screen.x < 0 || screen.x > 600 || screen.y < 0 || screen.y > 400) continue;
            const hit = renderer.hitTest(screen);
            if (hit?.type === 'edge' && hit.edgeId === id) {
              independentlyHittable = true;
              break;
            }
            observed.add(hit?.type === 'edge' ? 'edge:' + hit.edgeId : (hit?.type ?? 'outside'));
          }
          if (!independentlyHittable) {
            failures.push(
              count + ' Edges, target y=' + targetY + ', unreachable ' + id + ': ' + [...observed].join(', '),
            );
          }
        }
      });
    }
  }
  check(
    failures.length === 0,
    'Every orthogonal parallel Edge needs its own hittable visible path at a 48-unit endpoint gap:\n' +
      failures.join('\n'),
  );
}

async function previewWithoutEdge(kind: PathKind) {
  let rejectResolve = false;
  await withFixture(
    kind,
    ({ target, kernel, renderer }) => {
      rejectResolve = true;
      const committed = edgeElement(target).outerHTML;
      const source = { nodeId: sourceId, role: 'source' as const };
      renderer.updateInteraction({
        type: 'connection-preview',
        source,
        pointerWorldPoint: { x: 250, y: 90 },
        target: { type: 'none' },
      });
      const preview = target.querySelector('[data-nodebraid-connection-preview]');
      check(preview?.localName === 'g', 'Explicit preview mode must expose a semantic group.');
      const path = preview.querySelector<SVGPathElement>('[data-nodebraid-edge-path="' + kind + '"]');
      check(path && path.getTotalLength() > 0, 'Preview must use its configured path kind.');
      check(
        preview.querySelector('[data-nodebraid-edge-arrow]'),
        'Preview must display the source-to-pointer direction.',
      );
      check(
        !preview.querySelector('[data-nodebraid-edge-label]'),
        'Preview without an Edge must not invent an application label.',
      );
      const end = path.getPointAtLength(path.getTotalLength());
      check(Math.abs(end.x - 250) < 0.01 && Math.abs(end.y - 90) < 0.01, 'Unattached preview must end at the pointer.');
      renderer.updateInteraction({
        type: 'connection-preview',
        source,
        pointerWorldPoint: { x: 350, y: 190 },
        target: { type: 'valid', anchor: { nodeId: targetId, role: 'target' } },
      });
      check(
        target.querySelectorAll('[data-nodebraid-connection-preview]').length === 1,
        'Updating preview must not duplicate its semantic group.',
      );
      renderer.updateInteraction(null);
      check(
        !target.querySelector('[data-nodebraid-connection-preview]'),
        'Clearing preview must remove all transient path content.',
      );
      check(
        edgeElement(target).outerHTML === committed && kernel.read().snapshot.revision === 1,
        'Preview must preserve the committed Edge and Document.',
      );
    },
    (edge) => {
      if (rejectResolve) throw new Error('Preview must not resolve an Edge that does not exist.');
      return { path: kind, label: String(edge.data) };
    },
  );
}

function assertFiniteGeometry(target: SVGSVGElement) {
  const path = edgePath(target);
  const length = path.getTotalLength();
  check(Number.isFinite(length) && length > 0, 'Accepted endpoints must produce finite nonempty geometry.');
  for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
    const point = path.getPointAtLength(length * fraction);
    check(Number.isFinite(point.x) && Number.isFinite(point.y), 'Every visible path point must be finite.');
  }
  const arrow = edgeElement(target).querySelector<SVGPathElement>('[data-nodebraid-edge-arrow]');
  check(
    arrow && Number.isFinite(arrow.getTotalLength()) && arrow.getTotalLength() > 0,
    'Direction arrow must remain finite.',
  );
}

function assertTargetArrow(target: SVGSVGElement) {
  const path = edgePath(target);
  const end = path.getPointAtLength(path.getTotalLength());
  const before = path.getPointAtLength(Math.max(0, path.getTotalLength() - 0.1));
  const dx = end.x - before.x;
  const dy = end.y - before.y;
  const arrow = edgeElement(target).querySelector<SVGPathElement>('[data-nodebraid-edge-arrow]');
  check(arrow, 'Expected the target arrow.');
  const box = arrow.getBBox();
  check(
    end.x >= box.x - 0.01 &&
      end.x <= box.x + box.width + 0.01 &&
      end.y >= box.y - 0.01 &&
      end.y <= box.y + box.height + 0.01,
    'Arrow must be attached at the target endpoint.',
  );
  for (let index = 0; index <= 20; index += 1) {
    const point = arrow.getPointAtLength((arrow.getTotalLength() * index) / 20);
    check(
      (point.x - end.x) * dx + (point.y - end.y) * dy <= 0.01,
      'Arrow body must trail the target tip along the path direction.',
    );
  }
}

async function endpointGeometryAndTolerance(kind: PathKind) {
  await withFixture(kind, ({ target, kernel, renderer }) => {
    assertTargetArrow(target);
    const horizontal = kernel.transact((transaction) => {
      const node = transaction.query.getNode(targetId);
      check(node, 'Expected the target Node for the tolerance fixture.');
      transaction.nodes.replace(targetId, { ...node, position: { x: 300, y: 30 } });
    });
    check(horizontal, 'The tolerance fixture must become a horizontal connection.');
    renderer.updateDocument({ type: 'commit', commit: horizontal });
    for (const zoom of [0.1, 1, 2]) {
      renderer.updateSession({ selection: { nodeIds: [], edgeIds: [] }, viewport: { x: 0, y: 0, zoom } });
      const path = edgePath(target);
      const distance = path.getTotalLength() / 2;
      const middle = path.getPointAtLength(distance);
      const nearby = path.getPointAtLength(distance + 0.1);
      const dx = nearby.x - middle.x;
      const dy = nearby.y - middle.y;
      const length = Math.hypot(dx, dy);
      check(length > 0, 'Expected a path direction for the tolerance sample.');
      const atOffset = (pixels: number) => ({
        x: middle.x * zoom - (dy / length) * pixels,
        y: middle.y * zoom + (dx / length) * pixels,
      });
      const near = renderer.hitTest(atOffset(3));
      check(
        near?.type === 'edge' && near.edgeId === readableId,
        'Three CSS pixels must remain within Edge hit tolerance at every zoom.',
      );
      const outside = renderer.hitTest(atOffset(5));
      check(
        outside?.type === 'canvas',
        'Five CSS pixels must remain outside Edge hit tolerance for ' +
          kind +
          ' at zoom ' +
          zoom +
          ': ' +
          JSON.stringify(outside),
      );
    }
    renderer.updateSession({ selection: { nodeIds: [], edgeIds: [] }, viewport: { x: 0, y: 0, zoom: 1 } });
    for (const position of [
      { x: 105, y: 30 },
      { x: 25, y: 35 },
      { x: 20, y: 30 },
      { x: 0, y: 150 },
    ]) {
      const commit = kernel.transact((transaction) => {
        const node = transaction.query.getNode(targetId);
        check(node, 'Expected target Node.');
        transaction.nodes.replace(targetId, { ...node, position });
      });
      check(commit, 'Geometry fixture position must change.');
      renderer.updateDocument({ type: 'commit', commit });
      assertFiniteGeometry(target);
      assertTargetArrow(target);
    }
    const reversed = replaceEdge(kernel, { source: { nodeId: targetId }, target: { nodeId: sourceId } });
    renderer.updateDocument({ type: 'commit', commit: reversed });
    assertFiniteGeometry(target);
    assertTargetArrow(target);
    const before = target.innerHTML;
    const selfLoop = replaceEdge(kernel, { target: { nodeId: targetId } });
    const error = thrownBy(() => renderer.updateDocument({ type: 'commit', commit: selfLoop }));
    check(error instanceof Error, 'Self-loops must remain explicitly rejected.');
    check(target.innerHTML === before, 'Self-loop rejection must retain accepted geometry.');
  });
}

async function domFailureRollsBack() {
  await withFixture('bezier', ({ target, kernel, renderer }) => {
    const before = target.innerHTML;
    const originalEdge = edgeElement(target);
    const originalPath = edgePath(target).getAttribute('d');
    const commit = kernel.transact((transaction) => {
      const node = transaction.query.getNode(sourceId);
      check(node, 'Expected the source Node before its move.');
      transaction.nodes.replace(sourceId, { ...node, position: { x: 60, y: 80 } });
    });
    check(commit, 'Moving source Node must commit.');
    const originalSet = Element.prototype.setAttribute;
    const failure = new Error('injected live DOM failure');
    let rejectOnce = true;
    Element.prototype.setAttribute = function (name, value) {
      const changed = this.getAttribute(name) !== value;
      originalSet.call(this, name, value);
      if (rejectOnce && changed && target.contains(this)) {
        rejectOnce = false;
        throw failure;
      }
    };
    try {
      check(
        thrownBy(() => renderer.updateDocument({ type: 'commit', commit })) === failure,
        'A live DOM failure must preserve its original identity.',
      );
    } finally {
      Element.prototype.setAttribute = originalSet;
    }
    check(!rejectOnce, 'The fault injection must reach a changed live DOM value.');
    check(
      target.innerHTML === before && edgeElement(target) === originalEdge,
      'Rollback must restore the complete DOM and original Edge identity.',
    );
    assertPathHit(renderer, edgePath(target));
    renderer.updateDocument({ type: 'commit', commit });
    check(
      edgeElement(target) === originalEdge && edgePath(target).getAttribute('d') !== originalPath,
      'The same commit must remain applicable after DOM rollback.',
    );
  });
}

async function portEndpoints(kind: PathKind) {
  await withFixture(kind, ({ target, kernel, renderer }) => {
    const commit = replaceEdge(kernel, {
      source: { nodeId: sourceId, portId: 'output-b' },
      target: { nodeId: targetId, portId: 'input' },
    });
    const ports: {
      documentRevision: number;
      generation: number;
      nodes: { nodeId: typeof sourceId; ports: PortDefinition[] }[];
    } = {
      documentRevision: kernel.read().snapshot.revision,
      generation: 1,
      nodes: [
        {
          nodeId: sourceId,
          ports: [
            { id: 'output-a', role: 'source' as const },
            { id: 'output-b', role: 'source' as const },
          ],
        },
        { nodeId: targetId, ports: [{ id: 'input', role: 'target' as const }] },
      ],
    };
    renderer.updateDocument({ type: 'commit', commit, ports });
    const assertPorts = () => {
      const path = edgePath(target);
      const points = [path.getPointAtLength(0), path.getPointAtLength(path.getTotalLength())];
      for (const [index, [node, port]] of [
        [sourceId, 'output-b'],
        [targetId, 'input'],
      ].entries()) {
        const element = target.querySelector(
          '[data-nodebraid-port-node-id="' + node + '"][data-nodebraid-port-id="' + port + '"]',
        );
        check(element, 'Expected the corresponding public Port projection.');
        check(
          Math.abs(points[index]!.x - Number(element.getAttribute('cx'))) < 0.01 &&
            Math.abs(points[index]!.y - Number(element.getAttribute('cy'))) < 0.01,
          'Readable Edge endpoints must equal their exact Port Geometry.',
        );
      }
    };
    assertPorts();
    const stable = edgePath(target).getAttribute('d');
    renderer.updateInteraction({
      type: 'node-drag',
      nodes: [{ nodeId: sourceId, basePosition: { x: 20, y: 30 }, position: { x: 70, y: 80 } }],
    });
    assertPorts();
    assertPathHit(renderer, edgePath(target));
    renderer.updateInteraction(null);
    assertPorts();
    check(edgePath(target).getAttribute('d') === stable, 'Clearing Port drag must restore the original geometry.');
    const oldStart = edgePath(target).getPointAtLength(0);
    ports.nodes[0]!.ports.push({ id: 'output-c', role: 'source' });
    ports.generation += 1;
    renderer.updateDocument({ type: 'reset', view: kernel.read(), ports });
    assertPorts();
    check(
      edgePath(target).getPointAtLength(0).y !== oldStart.y,
      'Port-only reset must recompute the accepted Edge endpoint.',
    );
    const before = target.innerHTML;
    ports.nodes[0]!.ports = [];
    ports.generation += 1;
    const failure = thrownBy(() => renderer.updateDocument({ type: 'reset', view: kernel.read(), ports }));
    check(
      failure instanceof Error && target.innerHTML === before,
      'Missing Port must fail without a node-center fallback or partial reset.',
    );
  });
}

async function remoteDegenerateArrow(kind: PathKind) {
  await withFixture(kind, ({ kernel, renderer }) => {
    const commit = kernel.transact((transaction) => {
      for (const id of [sourceId, targetId]) {
        const node = transaction.query.getNode(id);
        check(node, 'Expected the remote fixture Node.');
        transaction.nodes.replace(id, { ...node, position: { x: 1e18, y: 1e18 } });
      }
    });
    check(commit, 'Moving the graph far outside the Target must commit.');
    renderer.updateDocument({ type: 'commit', commit });
    check(
      renderer.hitTest({ x: 0, y: 0 })?.type === 'canvas',
      'A numerically collapsed arrow far outside the Target must not hit empty canvas.',
    );
  });
}

export async function runEdgePresentationCases(): Promise<readonly string[]> {
  const passed: string[] = [];
  for (const kind of ['orthogonal', 'bezier'] as const) {
    await withFixture(kind, ({ target, kernel, renderer }) => {
      const edge = target.querySelector('[data-nodebraid-edge-id="readable-edge"]');
      check(edge?.localName === 'g', 'Readable Edge must have one stable semantic group.');
      check(
        target.querySelectorAll('[data-nodebraid-edge-id]').length === 1,
        'An Edge must expose exactly one entity ID.',
      );
      const path = edge.querySelector<SVGPathElement>('[data-nodebraid-edge-path="' + kind + '"]');
      check(path && path.getTotalLength() > 0, 'Explicit ' + kind + ' mode must render a nonempty path.');
      const arrow = edge.querySelector<SVGPathElement>('[data-nodebraid-edge-arrow]');
      check(arrow && arrow.getTotalLength() > 0, 'Readable Edge must display its direction arrow.');
      const label = edge.querySelector('[data-nodebraid-edge-label]');
      check(
        label?.textContent === '<b>Approve & continue</b>' && !label.children.length,
        'Application labels must stay literal text.',
      );
      const start = path.getPointAtLength(0);
      const end = path.getPointAtLength(path.getTotalLength());
      check(
        Math.abs(start.x - 100) < 0.01 &&
          Math.abs(start.y - 60) < 0.01 &&
          Math.abs(end.x - 300) < 0.01 &&
          Math.abs(end.y - 180) < 0.01,
        'Node-level paths must connect the source and target boundaries, not their centers.',
      );
      const midpoint = path.getPointAtLength(path.getTotalLength() / 2);
      const hit = renderer.hitTest(midpoint);
      check(
        hit?.type === 'edge' && hit.edgeId === 'readable-edge',
        'Hit Test must follow the visible ' + kind + ' path.',
      );
      check(kernel.read().snapshot.revision === 1, 'Displaying and hitting an Edge must not modify the Document.');
    });
    passed.push(kind + '-display-and-hit');
  }
  await orthogonalParallelNarrowGap();
  passed.push('orthogonal-parallel-narrow-gap');
  await acceptedPresentationAndFailures();
  passed.push('accepted-presentation-and-failures');
  await domFailureRollsBack();
  passed.push('dom-failure-rolls-back');
  for (const kind of ['orthogonal', 'bezier'] as const) {
    await parallelEdgesAndReflow(kind);
    passed.push(kind + '-parallel-and-reflow');
    await previewWithoutEdge(kind);
    passed.push(kind + '-preview-without-edge');
    await endpointGeometryAndTolerance(kind);
    passed.push(kind + '-endpoint-geometry-and-tolerance');
    await portEndpoints(kind);
    passed.push(kind + '-port-endpoints');
    await remoteDegenerateArrow(kind);
    passed.push(kind + '-remote-degenerate-arrow');
  }
  return passed;
}
