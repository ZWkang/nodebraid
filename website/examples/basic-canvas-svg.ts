import { edgeId, nodeId, type NodeId } from '@cflow/kernel';
import { commandService, type CommandService } from '@cflow/plugin-command';
import { kernelService, type KernelService } from '@cflow/plugin-kernel';
import { sessionService, type SessionService } from '@cflow/plugin-session';
import { createBasicCanvasPlugin } from '@cflow/preset-basic';
import { createSvgRenderer } from '@cflow/renderer-svg';
import { createPluginHost, definePlugin } from '@cflow/runtime-cordis';

export interface BasicCanvasSvgExample {
  readonly primaryNodeId: NodeId;
  readonly kernel: KernelService;
  readonly commands: CommandService;
  readonly session: SessionService;
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
  const applicationPlugin = definePlugin({
    requires: { kernel: kernelService, commands: commandService, session: sessionService },
    setup(context) {
      kernel = context.services.kernel;
      commands = context.services.commands;
      session = context.services.session;
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
      dispose: () => host.dispose(),
    });
  } catch (error) {
    await host.dispose();
    throw error;
  }
}
