import { edgeId, nodeId, type NodeId } from '@cflow/kernel';
import { commandService, type CommandService } from '@cflow/plugin-command';
import { kernelService, type KernelService } from '@cflow/plugin-kernel';
import { rendererService } from '@cflow/plugin-renderer';
import { sessionService, type SessionService } from '@cflow/plugin-session';
import { createBasicCanvasPlugin } from '@cflow/preset-basic';
import { createSvgRenderer } from '@cflow/renderer-svg';
import { createPluginHost, definePlugin } from '@cflow/runtime-cordis';

export interface BasicCanvasSvgExample {
  readonly primaryNodeId: NodeId;
  readonly kernel: KernelService;
  readonly commands: CommandService;
  readonly session: SessionService;
  getInputCount(): number;
  getLastPointerId(): number | undefined;
  dispose(): Promise<void>;
}

export async function createBasicCanvasSvgExample(target: SVGSVGElement): Promise<BasicCanvasSvgExample> {
  const host = createPluginHost();
  const basicCanvasPlugin = createBasicCanvasPlugin(createSvgRenderer, {
    interaction: { wheelZoomSensitivity: Math.log(2) / 100 },
  });
  let kernel: KernelService | undefined;
  let commands: CommandService | undefined;
  let session: SessionService | undefined;
  let inputCount = 0;
  let lastPointerId: number | undefined;
  const applicationPlugin = definePlugin({
    requires: {
      kernel: kernelService,
      commands: commandService,
      session: sessionService,
      renderer: rendererService,
    },
    setup(context) {
      kernel = context.services.kernel;
      commands = context.services.commands;
      session = context.services.session;
      const stopInput = context.services.renderer.subscribeInput((input) => {
        inputCount += 1;
        if (input.type === 'pointer.down') lastPointerId = input.pointerId;
      });
      context.own(stopInput);
    },
  });
  const composition = host.install(basicCanvasPlugin, { target });
  const application = host.install(applicationPlugin);

  try {
    await Promise.all([composition.whenActive(), application.whenActive()]);
    if (!kernel || !commands || !session) throw new Error('Expected the Basic Canvas Runtime Services.');

    const primaryNodeId = nodeId('basic-example-primary');
    const targetNodeId = nodeId('basic-example-target');
    kernel.transact((transaction) => {
      transaction.nodes.add({
        id: primaryNodeId,
        type: 'task',
        position: { x: 10, y: 20 },
        size: { width: 80, height: 40 },
        data: null,
      });
      transaction.nodes.add({
        id: targetNodeId,
        type: 'task',
        position: { x: 220, y: 120 },
        size: { width: 80, height: 40 },
        data: null,
      });
      transaction.edges.add({
        id: edgeId('basic-example-edge'),
        type: 'flow',
        source: { nodeId: primaryNodeId },
        target: { nodeId: targetNodeId },
        data: null,
      });
    });

    return Object.freeze({
      primaryNodeId,
      kernel,
      commands,
      session,
      getInputCount: () => inputCount,
      getLastPointerId: () => lastPointerId,
      dispose: () => host.dispose(),
    });
  } catch (error) {
    await host.dispose();
    throw error;
  }
}
