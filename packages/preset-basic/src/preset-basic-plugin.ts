import { commandPlugin } from '@nodebraid/plugin-command';
import { historyPlugin } from '@nodebraid/plugin-history';
import { interactionPlugin, type InteractionConfig } from '@nodebraid/plugin-interaction';
import { kernelPlugin } from '@nodebraid/plugin-kernel';
import { nodeEditingPlugin } from '@nodebraid/plugin-node-editing';
import { portPlugin } from '@nodebraid/plugin-port';
import { createRendererPlugin } from '@nodebraid/plugin-renderer';
import { sessionPlugin } from '@nodebraid/plugin-session';
import type { RendererFactory } from '@nodebraid/renderer-api';
import { definePlugin } from '@nodebraid/runtime-cordis';

export interface BasicCanvasPluginOptions {
  readonly interaction?: InteractionConfig;
}

export function createBasicCanvasPlugin<RendererConfig>(
  factory: RendererFactory<RendererConfig>,
  options?: BasicCanvasPluginOptions,
) {
  const rendererPlugin = createRendererPlugin(factory);
  const interactionConfig = resolveInteractionOptions(options);
  return definePlugin<RendererConfig>({
    name: '@nodebraid/preset-basic',
    async setup(context, config) {
      const installations = [
        context.install(kernelPlugin),
        context.install(portPlugin),
        context.install(commandPlugin),
        context.install(nodeEditingPlugin),
        context.install(sessionPlugin),
        context.install(rendererPlugin, config),
        context.install(interactionPlugin, interactionConfig),
        context.install(historyPlugin),
      ];
      await Promise.all(installations.map((installation) => installation.whenActive()));
    },
  });
}

function resolveInteractionOptions(options: BasicCanvasPluginOptions | undefined): InteractionConfig | undefined {
  if (options === undefined) return undefined;
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('Basic Canvas Plugin options must be an object.');
  }
  for (const key of Reflect.ownKeys(options)) {
    if (key !== 'interaction') {
      throw new TypeError('Basic Canvas Plugin options contain an unknown field.');
    }
  }
  return snapshotInteractionConfig(options.interaction);
}

function snapshotInteractionConfig(config: InteractionConfig | undefined): InteractionConfig | undefined {
  const input: unknown = config;
  if (input === undefined || input === null || typeof input !== 'object' || Array.isArray(input)) return config;
  const { connection, dragThreshold, wheelZoomSensitivity, minZoom, maxZoom, ...snapshot } =
    config as InteractionConfig;
  let ownedConnection = connection;
  if (connection !== undefined && connection !== null && typeof connection === 'object' && !Array.isArray(connection)) {
    const connectionValues = { ...connection };
    if (!Object.hasOwn(connectionValues, 'materializeEdge')) {
      connectionValues.materializeEdge = connection.materializeEdge;
    }
    ownedConnection = Object.freeze(connectionValues);
  }
  return Object.freeze({
    ...snapshot,
    dragThreshold,
    wheelZoomSensitivity,
    minZoom,
    maxZoom,
    connection: ownedConnection,
  });
}
