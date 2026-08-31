import {
  commandService,
  createBasicCanvasPlugin,
  createClipboardPlugin,
  createClipboardShortcutPlugin,
  createDuplicateSelectionPlugin,
  createDuplicateSelectionShortcutPlugin,
  createPluginHost,
  definePlugin,
  edgeId,
  historyService,
  kernelService,
  nodeId,
  rendererService,
  sessionService,
  type ClipboardErrorCode,
  type CommandService,
  type HistoryService,
  type KernelService,
  type SessionService,
} from '@nodebraid/core';
import { createSvgRenderer } from '@nodebraid/renderer-svg';

import { createNavigatorClipboardTransport, exampleCanvasFragmentTextCodec } from './clipboard-adapters';

export interface ClipboardFailureSnapshot {
  readonly code: ClipboardErrorCode;
  readonly causeName: string;
}

export interface ExampleRuntime {
  readonly commands: CommandService;
  readonly history: HistoryService;
  readonly kernel: KernelService;
  readonly session: SessionService;
  getClipboardFailure(): ClipboardFailureSnapshot | undefined;
  subscribeClipboardFailure(listener: () => void): () => void;
  disposeClipboardShortcuts(): Promise<void>;
  disposeDuplicateShortcut(): Promise<void>;
  dispose(): Promise<void>;
}

export async function createExampleRuntime(target: SVGSVGElement): Promise<ExampleRuntime> {
  let clipboardFailure: ClipboardFailureSnapshot | undefined;
  const clipboardFailureListeners = new Set<() => void>();
  const host = createPluginHost({
    diagnostics: {
      faultReporter(fault) {
        const clipboardError = findClipboardError(fault.error);
        if (!clipboardError) {
          queueMicrotask(() => {
            throw fault.error;
          });
          return;
        }
        clipboardFailure = Object.freeze({
          code: clipboardError.code,
          causeName: describeCauseName(clipboardError.cause),
        });
        for (const listener of [...clipboardFailureListeners]) listener();
      },
    },
  });
  let nextEdgeSequence = 1;
  let nextDuplicateNodeSequence = 1;
  let nextDuplicateEdgeSequence = 1;
  let nextClipboardNodeSequence = 1;
  let nextClipboardEdgeSequence = 1;
  const basicCanvasPlugin = createBasicCanvasPlugin(createSvgRenderer, {
    interaction: {
      minZoom: 0.25,
      maxZoom: 4,
      wheelZoomSensitivity: Math.log(2) / 100,
      connection: {
        materializeEdge({ source, target: edgeTarget }) {
          const id = edgeId(`example-edge-${nextEdgeSequence}`);
          nextEdgeSequence += 1;
          return { id, type: 'flow', source, target: edgeTarget, data: null };
        },
      },
    },
  });
  const duplicateSelectionPlugin = createDuplicateSelectionPlugin({
    materializeIds({ nodeIds, edgeIds }) {
      return {
        nodes: nodeIds.map((sourceId) => {
          const duplicateId = nodeId(`example-duplicate-node-${nextDuplicateNodeSequence}`);
          nextDuplicateNodeSequence += 1;
          return { sourceId, duplicateId };
        }),
        edges: edgeIds.map((sourceId) => {
          const duplicateId = edgeId(`example-duplicate-edge-${nextDuplicateEdgeSequence}`);
          nextDuplicateEdgeSequence += 1;
          return { sourceId, duplicateId };
        }),
      };
    },
  });
  const duplicateSelectionShortcutPlugin = createDuplicateSelectionShortcutPlugin();
  const clipboardPlugin = createClipboardPlugin({
    transport: createNavigatorClipboardTransport(),
    codec: exampleCanvasFragmentTextCodec,
    materializeIds({ nodeIds, edgeIds }) {
      return {
        nodes: nodeIds.map((sourceId) => {
          const materializedId = nodeId(`example-clipboard-node-${nextClipboardNodeSequence}`);
          nextClipboardNodeSequence += 1;
          return { sourceId, materializedId };
        }),
        edges: edgeIds.map((sourceId) => {
          const materializedId = edgeId(`example-clipboard-edge-${nextClipboardEdgeSequence}`);
          nextClipboardEdgeSequence += 1;
          return { sourceId, materializedId };
        }),
      };
    },
  });
  const clipboardShortcutPlugin = createClipboardShortcutPlugin();
  let commands: CommandService | undefined;
  let history: HistoryService | undefined;
  let kernel: KernelService | undefined;
  let session: SessionService | undefined;
  const applicationPlugin = definePlugin({
    name: 'nodebraid.examples.basic-svg',
    requires: {
      commands: commandService,
      history: historyService,
      kernel: kernelService,
      renderer: rendererService,
      session: sessionService,
    },
    setup(context) {
      commands = context.services.commands;
      history = context.services.history;
      kernel = context.services.kernel;
      session = context.services.session;
    },
  });
  const composition = host.install(basicCanvasPlugin, { target, connectionAnchorHitTolerance: 12 });
  const duplicateSelection = host.install(duplicateSelectionPlugin);
  const duplicateSelectionShortcut = host.install(duplicateSelectionShortcutPlugin);
  const clipboard = host.install(clipboardPlugin);
  const clipboardShortcuts = host.install(clipboardShortcutPlugin);
  const application = host.install(applicationPlugin);

  try {
    await Promise.all([
      composition.whenActive(),
      duplicateSelection.whenActive(),
      duplicateSelectionShortcut.whenActive(),
      clipboard.whenActive(),
      clipboardShortcuts.whenActive(),
      application.whenActive(),
    ]);
    if (!commands || !history || !kernel || !session) {
      throw new Error('Expected all Basic SVG Example Runtime Services.');
    }

    const first = nodeId('example-discover');
    const second = nodeId('example-compose');
    const third = nodeId('example-ship');
    const initialEdge = edgeId('example-initial-edge');
    const commit = kernel.transact((transaction) => {
      transaction.nodes.add({
        id: first,
        type: 'step',
        position: { x: 80, y: 100 },
        size: { width: 160, height: 88 },
        data: null,
      });
      transaction.nodes.add({
        id: second,
        type: 'step',
        position: { x: 360, y: 260 },
        size: { width: 160, height: 88 },
        data: null,
      });
      transaction.nodes.add({
        id: third,
        type: 'step',
        position: { x: 660, y: 120 },
        size: { width: 160, height: 88 },
        data: null,
      });
      transaction.edges.add({
        id: initialEdge,
        type: 'flow',
        source: { nodeId: first },
        target: { nodeId: second },
        data: null,
      });
    });
    if (!commit) throw new Error('Expected the Basic SVG Example initial graph Commit.');

    return Object.freeze({
      commands,
      history,
      kernel,
      session,
      getClipboardFailure: () => clipboardFailure,
      subscribeClipboardFailure(listener: () => void) {
        clipboardFailureListeners.add(listener);
        return () => clipboardFailureListeners.delete(listener);
      },
      disposeClipboardShortcuts: () => clipboardShortcuts.dispose(),
      disposeDuplicateShortcut: () => duplicateSelectionShortcut.dispose(),
      async dispose() {
        try {
          await host.dispose();
        } finally {
          clipboardFailureListeners.clear();
        }
      },
    });
  } catch (error) {
    await host.dispose();
    throw error;
  }
}

function describeCauseName(cause: unknown): string {
  if (cause instanceof Error) return cause.name;
  return cause === undefined ? 'None' : typeof cause;
}

function findClipboardError(
  error: unknown,
  seen = new Set<object>(),
): (Error & Readonly<{ domain: 'plugin.clipboard'; code: ClipboardErrorCode; cause?: unknown }>) | undefined {
  if (typeof error !== 'object' || error === null || seen.has(error)) return undefined;
  seen.add(error);
  if (error instanceof Error && Reflect.get(error, 'domain') === 'plugin.clipboard') {
    return error as Error &
      Readonly<{
        domain: 'plugin.clipboard';
        code: ClipboardErrorCode;
        cause?: unknown;
      }>;
  }
  if (error instanceof AggregateError) {
    for (const nested of error.errors) {
      const found = findClipboardError(nested, seen);
      if (found) return found;
    }
  }
  return error instanceof Error ? findClipboardError(error.cause, seen) : undefined;
}
