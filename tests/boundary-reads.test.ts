import { expect, test } from 'bun:test';
import { acceptCanvasFragment, captureCanvasFragment, materializeCanvasFragment } from '@nodebraid/canvas-fragment';
import { serializeCanvasDocument } from '@nodebraid/document';
import { createWorldRect } from '@nodebraid/interaction-api';
import { createCanvasKernel, edgeId, nodeId } from '@nodebraid/kernel';
import { createLayoutInput, defineLayoutEngine, validateLayoutProposal } from '@nodebraid/layout-api';
import { createClipboardPlugin } from '@nodebraid/plugin-clipboard';
import { commandPlugin, defineCommand } from '@nodebraid/plugin-command';
import { createDuplicateSelectionPlugin } from '@nodebraid/plugin-duplicate-selection';
import { defineInteractionShortcut } from '@nodebraid/plugin-interaction';
import { kernelPlugin } from '@nodebraid/plugin-kernel';
import { createLayoutPlugin } from '@nodebraid/plugin-layout';
import { sessionPlugin } from '@nodebraid/plugin-session';
import { createPluginHost, definePlugin, type Plugin } from '@nodebraid/runtime-cordis';
import { trackReads } from './fixtures/read-tracker';

const a = nodeId('a');
const b = nodeId('b');
const ab = edgeId('ab');
const node = (id = a) => ({
  id,
  type: 'task',
  position: { x: 10, y: 20 },
  size: { width: 80, height: 40 },
  data: null,
});
const edge = () => ({ id: ab, type: 'flow', source: { nodeId: a }, target: { nodeId: b }, data: null });

function view() {
  const kernel = createCanvasKernel();
  kernel.transact((tx) => {
    tx.nodes.add(node(a));
    tx.nodes.add(node(b));
    tx.edges.add(edge());
  });
  return kernel.read();
}
const fragment = () => ({
  type: 'nodebraid.canvas-fragment' as const,
  nodes: [{ id: a, type: 'task', position: { x: 0, y: 0 }, data: null }],
  edges: [],
  selection: { nodeIds: [a], edgeIds: [] },
});
const engine = () => ({
  id: 'scan',
  capabilities: { incremental: false, fixedNodes: false, selfLoops: false },
  compute: () => ({ sourceRevision: 0, positions: [] }),
});

async function activate(plugin: Plugin) {
  const host = createPluginHost();
  const installations = [kernelPlugin, commandPlugin, sessionPlugin, plugin].map((entry) => host.install(entry));
  await Promise.all(installations.map((installation) => installation.whenActive()));
  await Promise.all(installations.map((installation) => installation.dispose()));
}

// Each boundary receives tracked caller input; the tracker reports any own property path read twice.
const boundaries: [string, (track: <T extends object>(value: T, root: string) => T) => unknown][] = [
  ['createWorldRect', (t) => createWorldRect(t({ x: 1, y: 2 }, 'start'), t({ x: 5, y: 9 }, 'end'))],
  ['Transaction nodes.add', (t) => createCanvasKernel().transact((tx) => tx.nodes.add(t(node(), 'node')))],
  [
    'Transaction edges.add',
    (t) =>
      createCanvasKernel().transact((tx) => {
        tx.nodes.add(node(a));
        tx.nodes.add(node(b));
        tx.edges.add(t(edge(), 'edge'));
      }),
  ],
  ['createLayoutInput', (t) => createLayoutInput(view(), t({ mode: 'full', fixedNodeIds: [a] }, 'options'))],
  [
    'validateLayoutProposal',
    (t) => {
      const input = createLayoutInput(view(), { mode: 'full', fixedNodeIds: [] });
      return validateLayoutProposal(
        input,
        t(
          {
            sourceRevision: input.revision,
            positions: [
              { id: a, position: { x: 1, y: 2 } },
              { id: b, position: { x: 3, y: 4 } },
            ],
          },
          'proposal',
        ),
      );
    },
  ],
  ['defineLayoutEngine', (t) => defineLayoutEngine(t(engine(), 'engine'))],
  ['acceptCanvasFragment', (t) => acceptCanvasFragment(t(fragment(), 'fragment'))],
  ['captureCanvasFragment', (t) => captureCanvasFragment(view(), t({ nodeIds: [a, b], edgeIds: [ab] }, 'selection'))],
  [
    'materializeCanvasFragment',
    (t) =>
      materializeCanvasFragment(
        acceptCanvasFragment(fragment()),
        t({ nodes: [{ sourceId: a, materializedId: nodeId('copy') }], edges: [] }, 'mapping'),
        t({ x: 3, y: 4 }, 'offset'),
      ),
  ],
  [
    'serializeCanvasDocument',
    (t) =>
      serializeCanvasDocument(
        view().snapshot,
        t({ format: 'scan/v1', encode: (value: unknown) => JSON.stringify(value), decode: JSON.parse }, 'codec'),
      ),
  ],
  [
    'defineInteractionShortcut',
    (t) =>
      defineInteractionShortcut(
        t(
          { code: 'KeyD', modifierAlternatives: [{ alt: false, control: true, meta: false, shift: false }] },
          'shortcut',
        ),
      ),
  ],
  ['definePlugin', (t) => definePlugin(t({ name: 'scan', setup: () => undefined } as never, 'plugin'))],
  [
    'createLayoutPlugin',
    (t) =>
      activate(
        createLayoutPlugin(
          t({ engine: defineLayoutEngine(engine()), command: defineCommand('scan.layout') }, 'config') as never,
        ),
      ),
  ],
  [
    'createDuplicateSelectionPlugin',
    (t) =>
      activate(
        createDuplicateSelectionPlugin(t({ materializeIds: () => ({ nodes: [], edges: [] }) }, 'options') as never),
      ),
  ],
  [
    'createClipboardPlugin',
    (t) =>
      activate(
        createClipboardPlugin(
          t(
            {
              transport: { readText: async () => '', writeText: async () => undefined },
              codec: { encode: (value: unknown) => value, decode: (value: unknown) => value },
              materializeIds: () => ({ nodes: [], edges: [] }),
            },
            'options',
          ) as never,
        ),
      ),
  ],
];

test.each(boundaries)('%s reads each caller input property once', async (_, call) => {
  const trackers: ReturnType<typeof trackReads>[] = [];
  let error: unknown;
  try {
    await call((value, root) => {
      const tracker = trackReads(value, root);
      trackers.push(tracker);
      return tracker.input;
    });
  } catch (caught) {
    error = caught;
  }
  expect({ error, repeated: trackers.flatMap((tracker) => tracker.repeated()) }).toEqual({
    error: undefined,
    repeated: [],
  });
});
