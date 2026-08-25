import {
  commandService,
  createBasicCanvasPlugin,
  createPluginHost,
  definePlugin,
  edgeId,
  historyService,
  kernelService,
  nodeId,
  rendererService,
  sessionService,
  type CommandService,
  type HistoryService,
  type KernelService,
  type SessionService,
} from '@nodebraid/core';
import { createSvgRenderer } from '@nodebraid/renderer-svg';

export interface ExampleRuntime {
  readonly commands: CommandService;
  readonly history: HistoryService;
  readonly kernel: KernelService;
  readonly session: SessionService;
  dispose(): Promise<void>;
}

export async function createExampleRuntime(target: SVGSVGElement): Promise<ExampleRuntime> {
  const host = createPluginHost();
  let nextEdgeSequence = 1;
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
  const application = host.install(applicationPlugin);

  try {
    await Promise.all([composition.whenActive(), application.whenActive()]);
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

    return Object.freeze({ commands, history, kernel, session, dispose: () => host.dispose() });
  } catch (error) {
    await host.dispose();
    throw error;
  }
}
