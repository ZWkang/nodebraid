import {
  createCanvasKernel,
  edgeId,
  nodeId,
  type CanvasCommit,
  type CanvasKernel,
  type CanvasNode,
} from '@nodebraid/kernel';
import type { CanvasRenderer } from '@nodebraid/renderer-api';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { portPlugin, portService, type PortService } from '@nodebraid/plugin-port';
import { createRendererPlugin, rendererService, type RendererService } from '@nodebraid/plugin-renderer';
import { sessionPlugin, sessionService, type SessionService } from '@nodebraid/plugin-session';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';
import {
  createSvgRenderer,
  type SvgNodeContentContext,
  type SvgNodeContentFactory,
  type SvgRendererConfig,
} from '../src';

const namespace = 'http://www.w3.org/2000/svg';
const firstId = nodeId('content-a');
const secondId = nodeId('content-b');

function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function target() {
  const element = document.createElementNS(namespace, 'svg');
  element.setAttribute('width', '400');
  element.setAttribute('height', '300');
  const caller = document.createElementNS(namespace, 'defs');
  caller.setAttribute('data-caller-owned', 'true');
  element.append(caller);
  document.body.append(element);
  return { element, caller };
}

function graph() {
  const kernel = createCanvasKernel();
  kernel.transact((tx) => {
    tx.nodes.add({
      id: firstId,
      type: 'circle',
      position: { x: 20, y: 30 },
      size: { width: 80, height: 60 },
      data: 'first',
    });
    tx.nodes.add({
      id: secondId,
      type: 'text',
      position: { x: 220, y: 40 },
      size: { width: 100, height: 60 },
      data: 'second',
    });
    tx.edges.add({
      id: edgeId('content-edge'),
      type: 'link',
      source: { nodeId: firstId },
      target: { nodeId: secondId },
      data: null,
    });
  });
  return kernel;
}

function content(context: SvgNodeContentContext): SVGElement {
  const root = context.document.createElementNS(namespace, 'g');
  root.setAttribute('data-content-kind', context.type);
  const visual = context.document.createElementNS(namespace, context.type === 'circle' ? 'circle' : 'text');
  if (context.type === 'circle') {
    visual.setAttribute('cx', String(context.size.width / 2));
    visual.setAttribute('cy', String(context.size.height / 2));
    visual.setAttribute('r', '20');
  } else {
    visual.setAttribute('x', '5');
    visual.setAttribute('y', '20');
  }
  visual.textContent = String(context.data);
  root.append(visual);
  return root;
}

function nodeElement(element: SVGSVGElement, id = firstId): SVGElement {
  const node = element.querySelector<SVGElement>(
    '.nodebraid-renderer-svg__nodes > [data-nodebraid-node-id="' + id + '"]',
  );
  check(node, 'Expected a public keyed Node element.');
  return node;
}

function replace(kernel: CanvasKernel, id: CanvasNode['id'], changes: Partial<CanvasNode>): CanvasCommit {
  const commit = kernel.transact((tx) => {
    const before = tx.query.getNode(id);
    check(before, 'Expected the existing Node.');
    tx.nodes.replace(id, { ...before, ...changes });
  });
  check(commit, 'Expected a changed Node Commit.');
  return commit;
}

function acceptSession(renderer: CanvasRenderer) {
  renderer.updateSession({ selection: { nodeIds: [], edgeIds: [] }, viewport: { x: 0, y: 0, zoom: 1 } });
}

async function projectionAndLifecycle() {
  const { element, caller } = target();
  const kernel = graph();
  const contexts: SvgNodeContentContext[] = [];
  const renderer = createSvgRenderer({
    target: element,
    createNodeContent(context) {
      contexts.push(context);
      return content(context);
    },
  });
  try {
    renderer.updateDocument({ type: 'reset', view: kernel.read() });
    acceptSession(renderer);
    const first = nodeElement(element);
    const originalContent = first.firstElementChild;
    check(
      first.localName === 'g' && first.getAttribute('transform') === 'translate(20 30)',
      'Custom content must use a positioned stable outer group.',
    );
    check(
      first.querySelector('circle') && nodeElement(element, secondId).querySelector('text'),
      'Both application Node types must render.',
    );
    check(
      Number(contexts.length) === 2 &&
        contexts.every((context) => Object.isFrozen(context) && Object.isFrozen(context.size)),
      'Content context and owned size must be immutable.',
    );
    check(
      contexts[0]?.document === document && contexts[0]?.data === kernel.read().query.getNode(firstId)?.data,
      'Context must retain owner Document and original data.',
    );
    const corner = renderer.hitTest({ x: 21, y: 31 });
    check(
      corner?.type === 'node' && corner.nodeId === firstId,
      'Circle corner must retain rectangular Node hit semantics.',
    );
    renderer.updateSession({ selection: { nodeIds: [firstId], edgeIds: [] }, viewport: { x: 5, y: 6, zoom: 2 } });
    check(first.getAttribute('data-nodebraid-selected') === 'true', 'Selection belongs to the outer Node.');
    renderer.updateInteraction({
      type: 'node-drag',
      nodes: [{ nodeId: firstId, basePosition: { x: 20, y: 30 }, position: { x: 70, y: 80 } }],
    });
    check(
      first.getAttribute('transform') === 'translate(70 80)' && first.firstElementChild === originalContent,
      'Drag must move the existing custom content.',
    );
    check(renderer.hitTest({ x: 147, y: 168 })?.type === 'node', 'Hit Test must use the dragged effective geometry.');
    renderer.updateInteraction(null);
    const move = replace(kernel, firstId, { position: { x: 50, y: 60 } });
    renderer.updateDocument({ type: 'commit', commit: move });
    check(
      first.getAttribute('transform') === 'translate(50 60)' &&
        Number(contexts.length) === 2 &&
        first.firstElementChild === originalContent,
      'Position, Selection, Viewport and drag must not reconstruct content.',
    );
    const edge = element.querySelector('[data-nodebraid-edge-id="content-edge"]');
    check(
      edge?.getAttribute('x1') === '90' && edge.getAttribute('y1') === '90',
      'Connected Edge must follow custom Node position.',
    );
    const data = { label: 'edited' };
    renderer.updateDocument({ type: 'commit', commit: replace(kernel, firstId, { data }) });
    check(
      Number(contexts.length) === 3 &&
        contexts.at(-1)?.data === data &&
        nodeElement(element) === first &&
        first.firstElementChild !== originalContent,
      'Data updates must reconstruct only changed content and retain outer identity.',
    );
    renderer.updateDocument({ type: 'commit', commit: replace(kernel, firstId, { type: 'text' }) });
    renderer.updateDocument({ type: 'commit', commit: replace(kernel, firstId, { size: { width: 120, height: 70 } }) });
    check(
      Number(contexts.length) === 5 && first.querySelector('text'),
      'Type and Size values must reconstruct content.',
    );
    const previousContent = first.firstElementChild;
    const view = kernel.read();
    renderer.updateDocument({
      type: 'commit',
      commit: replace(kernel, secondId, { position: { x: 230, y: 50 } }),
      ports: {
        documentRevision: view.snapshot.revision + 1,
        generation: 1,
        nodes: [{ nodeId: firstId, ports: [{ id: 'output', role: 'source' }] }],
      },
    });
    check(
      Number(contexts.length) === 5 && first.firstElementChild === previousContent,
      'Port changes must not reconstruct content.',
    );
    const port = element.querySelector('[data-nodebraid-port-node-id="content-a"]');
    check(
      port?.getAttribute('cx') === '170' && port.getAttribute('cy') === '95',
      'Port geometry must use declared Node size.',
    );
    renderer.updateDocument({ type: 'reset', view: kernel.read() });
    check(
      Number(contexts.length) === 7 && nodeElement(element) !== first,
      'Reset must reconstruct content and may replace outer identity.',
    );
    acceptSession(renderer);
    const remove = kernel.transact((tx) => {
      tx.edges.remove(edgeId('content-edge'));
      tx.nodes.remove(firstId);
    });
    check(remove, 'Expected Node removal Commit.');
    renderer.updateDocument({ type: 'commit', commit: remove });
    check(
      !element.querySelector('[data-nodebraid-node-id="content-a"]') && Number(contexts.length) === 7,
      'Removal must not construct content.',
    );
  } finally {
    await renderer.dispose();
    check(
      element.children.length === 1 && element.firstElementChild === caller,
      'Disposal must preserve caller-owned Target contents.',
    );
    element.remove();
  }
}

async function constructorFailureAndRollback() {
  const { element } = target();
  const kernel = graph();
  const original = Symbol('content construction failed');
  let fail = false;
  const renderer = createSvgRenderer({
    target: element,
    createNodeContent(context) {
      if (fail && context.nodeId === secondId) throw original;
      return content(context);
    },
  });
  try {
    renderer.updateDocument({ type: 'reset', view: kernel.read() });
    acceptSession(renderer);
    const first = nodeElement(element);
    const oldContent = first.firstElementChild;
    const before = element.innerHTML;
    const commit = kernel.transact((tx) => {
      for (const id of [firstId, secondId]) {
        const node = tx.query.getNode(id);
        check(node, 'Expected Node.');
        tx.nodes.replace(id, { ...node, data: 'new' });
      }
    });
    check(commit, 'Expected two changed Nodes.');
    fail = true;
    for (const update of [{ type: 'commit', commit } as const, { type: 'reset', view: kernel.read() } as const]) {
      let caught: unknown;
      try {
        renderer.updateDocument(update);
      } catch (error) {
        caught = error;
      }
      check(
        caught === original &&
          element.innerHTML === before &&
          nodeElement(element) === first &&
          first.firstElementChild === oldContent,
        'Late constructor failure must preserve original error and whole old projection.',
      );
    }
    fail = false;
    renderer.updateDocument({ type: 'commit', commit });
    check(first.firstElementChild !== oldContent, 'Failed construction must not advance accepted Baseline.');
    const updatedContent = first.firstElementChild;
    const beforePatch = element.innerHTML;
    const second = nodeElement(element, secondId);
    const nativeSet = second.setAttribute;
    const patchFailure = new Error('later Node position patch failed');
    second.setAttribute = function (name, value) {
      if (name === 'transform' && value === 'translate(240 60)') throw patchFailure;
      nativeSet.call(this, name, value);
    };
    const patch = kernel.transact((tx) => {
      const a = tx.query.getNode(firstId);
      const b = tx.query.getNode(secondId);
      check(a && b, 'Expected Nodes.');
      tx.nodes.replace(firstId, { ...a, data: 'another' });
      tx.nodes.replace(secondId, { ...b, position: { x: 240, y: 60 } });
    });
    check(patch, 'Expected deep content and position Commit.');
    let caught: unknown;
    try {
      renderer.updateDocument({ type: 'commit', commit: patch });
    } catch (error) {
      caught = error;
    }
    second.setAttribute = nativeSet;
    check(
      caught === patchFailure && element.innerHTML === beforePatch && first.firstElementChild === updatedContent,
      'Later DOM failure must restore exact original deep subtree.',
    );
    renderer.updateDocument({ type: 'commit', commit: patch });
    check(first.firstElementChild !== updatedContent, 'Rolled-back commit must remain retryable at the Renderer seam.');
  } finally {
    await renderer.dispose();
    element.remove();
  }
}

async function outputOwnership() {
  for (const kind of [
    'html',
    'attached',
    'duplicate',
    'previous',
    'promise',
    'spoofed-svg',
    'hidden-parent',
  ] as const) {
    const { element } = target();
    const kernel = graph();
    let shared: SVGElement | undefined;
    let previous = false;
    const attached = document.createElementNS(namespace, 'g');
    if (kind === 'hidden-parent') {
      element.firstElementChild?.append(attached);
      Object.defineProperty(attached, 'parentNode', { value: null });
    }
    const create: SvgNodeContentFactory = (context) => {
      if (kind === 'html') return document.createElement('div') as unknown as SVGElement;
      if (kind === 'promise') return Promise.resolve(content(context)) as unknown as SVGElement;
      if (kind === 'attached') return element;
      if (kind === 'hidden-parent') return attached;
      if (kind === 'spoofed-svg') {
        class FakeSvg {
          readonly parentNode = null;
          readonly ownerDocument = { defaultView: { SVGElement: FakeSvg } };
        }
        return new FakeSvg() as unknown as SVGElement;
      }
      if (kind === 'previous' && !previous) return content(context);
      shared ??= content(context);
      return shared;
    };
    const renderer = createSvgRenderer({ target: element, createNodeContent: create });
    try {
      if (kind === 'previous') {
        renderer.updateDocument({ type: 'reset', view: kernel.read() });
        shared = nodeElement(element).firstElementChild as SVGElement;
        previous = true;
      }
      const before = element.innerHTML;
      let caught: unknown;
      try {
        renderer.updateDocument({ type: 'reset', view: kernel.read() });
      } catch (error) {
        caught = error;
      }
      check(
        caught instanceof Error && element.innerHTML === before,
        'Invalid or multiply-owned ' + kind + ' output must fail without changing accepted DOM.',
      );
    } finally {
      await renderer.dispose();
      element.remove();
    }
  }
}

async function svgOwnerRealms() {
  const frame = document.createElement('iframe');
  document.body.append(frame);
  const frameDocument = frame.contentDocument;
  check(frameDocument, 'Expected the real iframe Document.');
  try {
    for (const ownerDocument of [frameDocument, document.implementation.createHTMLDocument('Detached SVG')]) {
      const { element } = target();
      const kernel = graph();
      const renderer = createSvgRenderer({
        target: element,
        createNodeContent(context) {
          const root = ownerDocument.createElementNS(namespace, 'text');
          root.textContent = String(context.data);
          return root;
        },
      });
      try {
        renderer.updateDocument({ type: 'reset', view: kernel.read() });
        check(
          nodeElement(element).firstElementChild?.textContent === 'first',
          'Real SVG content must support another realm or a detached Document.',
        );
      } finally {
        await renderer.dispose();
        element.remove();
      }
    }
  } finally {
    frame.remove();
  }
}

async function rollbackFailure() {
  const { element } = target();
  const kernel = graph();
  const renderer = createSvgRenderer({ target: element, createNodeContent: content });
  try {
    renderer.updateDocument({ type: 'reset', view: kernel.read() });
    acceptSession(renderer);
    const first = nodeElement(element);
    const second = nodeElement(element, secondId);
    const nativeReplace = first.replaceChildren;
    const nativeSet = second.setAttribute;
    const failure = new Error('custom content commit failure');
    const rollback = new Error('custom content rollback failure');
    let replacements = 0;
    first.replaceChildren = function (...children) {
      replacements += 1;
      if (replacements > 1) throw rollback;
      nativeReplace.apply(this, children);
    };
    second.setAttribute = function (name, value) {
      if (name === 'transform' && value === 'translate(250 60)') throw failure;
      nativeSet.call(this, name, value);
    };
    const commit = kernel.transact((tx) => {
      const a = tx.query.getNode(firstId);
      const b = tx.query.getNode(secondId);
      check(a && b, 'Expected Nodes.');
      tx.nodes.replace(firstId, { ...a, data: 'updated' });
      tx.nodes.replace(secondId, { ...b, position: { x: 250, y: 60 } });
    });
    check(commit, 'Expected changed Commit.');
    let caught: unknown;
    try {
      renderer.updateDocument({ type: 'commit', commit });
    } catch (error) {
      caught = error;
    }
    first.replaceChildren = nativeReplace;
    second.setAttribute = nativeSet;
    check(
      caught instanceof AggregateError && caught.errors.includes(failure) && caught.errors.includes(rollback),
      'Deep rollback failure must retain original failure and cleanup failure.',
    );
    let synchronizationError: unknown;
    try {
      acceptSession(renderer);
    } catch (error) {
      synchronizationError = error;
    }
    check(
      synchronizationError instanceof Error && Reflect.get(synchronizationError, 'code') === 'DOCUMENT_OUT_OF_SYNC',
      'Failed rollback must expose the existing terminal synchronization boundary.',
    );
    renderer.updateDocument({ type: 'reset', view: kernel.read() });
    acceptSession(renderer);
    check(
      nodeElement(element).textContent === 'updated',
      'Explicit reset must restore custom content after rollback failure.',
    );
  } finally {
    await renderer.dispose();
    element.remove();
  }
}

async function configurationAndLegacy() {
  for (const shape of ['own', 'inherited', 'hidden'] as const) {
    const { element } = target();
    const kernel = graph();
    let reads = 0;
    const config: SvgRendererConfig = { target: element };
    const holder = shape === 'inherited' ? {} : config;
    Object.defineProperty(holder, 'createNodeContent', {
      enumerable: shape !== 'hidden',
      get() {
        check(this === config, 'Configuration receiver must be preserved.');
        reads += 1;
        if (reads > 1) throw new Error('Callback config read twice.');
        return content;
      },
    });
    if (shape === 'inherited') Object.setPrototypeOf(config, holder);
    const renderer = createSvgRenderer(config);
    try {
      renderer.updateDocument({ type: 'reset', view: kernel.read() });
      check(reads === 1 && nodeElement(element).localName === 'g', 'Declared callback must be captured once.');
    } finally {
      await renderer.dispose();
      element.remove();
    }
  }
  const { element } = target();
  const kernel = graph();
  const renderer = createSvgRenderer({ target: element });
  try {
    renderer.updateDocument({ type: 'reset', view: kernel.read() });
    const first = nodeElement(element);
    check(
      first.localName === 'rect' && first.getAttribute('x') === '20' && first.getAttribute('width') === '80',
      'No callback must retain original rectangle DOM.',
    );
    renderer.updateDocument({ type: 'commit', commit: replace(kernel, firstId, { data: 'new' }) });
    check(
      nodeElement(element) === first && first.children.length === 0,
      'Legacy data commits must retain original rectangle identity.',
    );
  } finally {
    await renderer.dispose();
    element.remove();
  }
}

async function runtimePortResetRebuildsContent() {
  const { element, caller } = target();
  const host = createPluginHost();
  const constructions = new Map<CanvasNode['id'], number>();
  let services:
    | Readonly<{ kernel: KernelService; ports: PortService; session: SessionService; renderer: RendererService }>
    | undefined;
  const consumer = definePlugin({
    requires: { kernel: kernelService, ports: portService, session: sessionService, renderer: rendererService },
    setup(context) {
      services = context.services;
    },
  });
  try {
    const installations = [
      host.install(kernelPlugin),
      host.install(portPlugin),
      host.install(sessionPlugin),
      host.install(createRendererPlugin(createSvgRenderer), {
        target: element,
        createNodeContent(context) {
          constructions.set(context.nodeId, (constructions.get(context.nodeId) ?? 0) + 1);
          return content(context);
        },
      }),
      host.install(consumer),
    ];
    await Promise.all(installations.map((installation) => installation.whenActive()));
    check(services, 'Expected real Kernel, Port, Session and Renderer Runtime Services.');
    const { kernel, ports, session, renderer } = services;
    const seed = graph().read().snapshot;
    kernel.transact((tx) => {
      for (const node of seed.nodes) tx.nodes.add(node);
      for (const edge of seed.edges) tx.edges.add(edge);
    });
    session.setSelection({ nodeIds: [firstId], edgeIds: [] });
    session.setViewport({ x: 5, y: 6, zoom: 2 });
    const beforeRegistration = kernel.read();
    const beforeSession = session.getSnapshot();
    const originalNodes = [nodeElement(element, firstId), nodeElement(element, secondId)];
    const originalContents = originalNodes.map((node) => node.firstElementChild);
    check(
      constructions.get(firstId) === 1 && constructions.get(secondId) === 1,
      'Runtime initialization must construct both custom Nodes once.',
    );
    check(
      ports.snapshot(beforeRegistration.snapshot).generation === 0 &&
        element.querySelectorAll('[data-nodebraid-connection-anchor-node-id="content-a"]').length === 2,
      'Initial Nodes must expose node-level Anchors without Port Contributions.',
    );
    const registration = ports.register({
      id: 'browser.custom-content-reset',
      definePorts(node) {
        return node.id === firstId
          ? [
              { id: 'out-a', role: 'source' },
              { id: 'out-b', role: 'source' },
            ]
          : [];
      },
    });
    check(
      kernel.read() === beforeRegistration &&
        kernel.read().snapshot.revision === beforeRegistration.snapshot.revision &&
        session.getSnapshot() === beforeSession &&
        ports.snapshot(beforeRegistration.snapshot).generation === 1,
      'Registering a Port Contribution must change only Port generation, retaining Document and Session.',
    );
    const portNodes = [nodeElement(element, firstId), nodeElement(element, secondId)];
    check(
      constructions.get(firstId) === 2 &&
        constructions.get(secondId) === 2 &&
        portNodes.every(
          (node, index) => node !== originalNodes[index] && node.firstElementChild !== originalContents[index],
        ) &&
        portNodes[0]?.textContent === 'first' &&
        portNodes[1]?.textContent === 'second',
      'Port-triggered Runtime reset must reconstruct every Node content even at the same Document revision.',
    );
    const firstPort = element.querySelector(
      '[data-nodebraid-port-node-id="content-a"][data-nodebraid-port-id="out-a"]',
    );
    const secondPort = element.querySelector(
      '[data-nodebraid-port-node-id="content-a"][data-nodebraid-port-id="out-b"]',
    );
    check(
      firstPort?.getAttribute('cx') === '100' &&
        firstPort.getAttribute('cy') === '50' &&
        secondPort?.getAttribute('cx') === '100' &&
        secondPort.getAttribute('cy') === '70' &&
        element.querySelectorAll('[data-nodebraid-connection-anchor-node-id="content-a"]').length === 0 &&
        element.querySelectorAll('[data-nodebraid-connection-anchor-node-id="content-b"]').length === 2,
      'Registration reset must replace only the contributed Node Anchors with declared Port geometry.',
    );
    check(
      portNodes[0]?.getAttribute('data-nodebraid-selected') === 'true' &&
        element.querySelector('[data-nodebraid-renderer-svg-root]')?.getAttribute('transform') ===
          'matrix(2 0 0 2 5 6)',
      'Runtime reset must reapply the existing Selection and Viewport to rebuilt content.',
    );
    const portHit = renderer.hitTest({ x: 205, y: 106 });
    check(
      portHit?.type === 'port' && portHit.nodeId === firstId && portHit.portId === 'out-a',
      'Renderer Service must hit the registered Port through the retained Viewport.',
    );
    const portContents = portNodes.map((node) => node.firstElementChild);
    kernel.transact((tx) => {
      const node = tx.query.getNode(firstId);
      check(node, 'Expected the Node before its ordinary position Commit.');
      tx.nodes.replace(firstId, { ...node, position: { x: 40, y: 50 } });
    });
    check(
      constructions.get(firstId) === 2 &&
        constructions.get(secondId) === 2 &&
        nodeElement(element, firstId) === portNodes[0] &&
        nodeElement(element, secondId) === portNodes[1] &&
        portNodes.every((node, index) => node.firstElementChild === portContents[index]) &&
        firstPort.getAttribute('cx') === '120' &&
        firstPort.getAttribute('cy') === '70' &&
        secondPort.getAttribute('cy') === '90',
      'An ordinary position Commit must move Port geometry while retaining existing custom content.',
    );
    const beforeRemoval = kernel.read();
    const sessionBeforeRemoval = session.getSnapshot();
    registration.dispose();
    check(
      kernel.read() === beforeRemoval &&
        kernel.read().snapshot.revision === beforeRemoval.snapshot.revision &&
        session.getSnapshot() === sessionBeforeRemoval &&
        ports.snapshot(beforeRemoval.snapshot).generation === 2,
      'Disposing a Port Contribution must retain the current Document revision and Session.',
    );
    const restoredNodes = [nodeElement(element, firstId), nodeElement(element, secondId)];
    const sourceAnchor = element.querySelector(
      '[data-nodebraid-connection-anchor-node-id="content-a"][data-nodebraid-connection-anchor-role="source"]',
    );
    const targetAnchor = element.querySelector(
      '[data-nodebraid-connection-anchor-node-id="content-a"][data-nodebraid-connection-anchor-role="target"]',
    );
    check(
      constructions.get(firstId) === 3 &&
        constructions.get(secondId) === 3 &&
        restoredNodes.every(
          (node, index) => node !== portNodes[index] && node.firstElementChild !== portContents[index],
        ) &&
        restoredNodes[0]?.getAttribute('transform') === 'translate(40 50)' &&
        restoredNodes[0]?.getAttribute('data-nodebraid-selected') === 'true' &&
        restoredNodes[0]?.textContent === 'first' &&
        restoredNodes[1]?.textContent === 'second',
      'Port disposal reset must reconstruct all content at the current positions and preserve Selection.',
    );
    check(
      element.querySelectorAll('[data-nodebraid-port-node-id]').length === 0 &&
        sourceAnchor?.getAttribute('cx') === '120' &&
        sourceAnchor.getAttribute('cy') === '80' &&
        targetAnchor?.getAttribute('cx') === '40' &&
        targetAnchor.getAttribute('cy') === '80',
      'Disposal reset must restore node-level Anchor geometry and remove Ports.',
    );
    const anchorHit = renderer.hitTest({ x: 245, y: 166 });
    check(
      anchorHit?.type === 'connection-anchor' && anchorHit.nodeId === firstId && anchorHit.role === 'source',
      'Renderer Service must hit the restored Anchor after Port disposal.',
    );
  } finally {
    await host.dispose();
    check(
      element.children.length === 1 && element.firstElementChild === caller,
      'Real Runtime disposal must release custom projection and retain caller content.',
    );
    element.remove();
  }
}

export async function runNodeContentCases() {
  const results: string[] = [];
  for (const [name, run] of [
    ['projection-lifecycle', projectionAndLifecycle],
    ['construction-deep-rollback', constructorFailureAndRollback],
    ['ownership', outputOwnership],
    ['owner-realms', svgOwnerRealms],
    ['rollback-failure', rollbackFailure],
    ['config-and-legacy', configurationAndLegacy],
    ['runtime-port-reset', runtimePortResetRebuildsContent],
  ] as const) {
    await run();
    results.push(name);
  }
  return results;
}
