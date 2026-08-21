import { commandPlugin } from '@cflow/plugin-command';
import { historyPlugin } from '@cflow/plugin-history';
import { interactionPlugin } from '@cflow/plugin-interaction';
import { kernelPlugin } from '@cflow/plugin-kernel';
import { createRendererPlugin } from '@cflow/plugin-renderer';
import { sessionPlugin } from '@cflow/plugin-session';
import type { RendererFactory } from '@cflow/renderer-api';
import { definePlugin } from '@cflow/runtime-cordis';

export function createBasicCanvasPlugin<RendererConfig>(factory: RendererFactory<RendererConfig>) {
  const rendererPlugin = createRendererPlugin(factory);
  return definePlugin<RendererConfig>({
    name: '@cflow/preset-basic',
    async setup(context, config) {
      const installations = [
        context.install(kernelPlugin),
        context.install(commandPlugin),
        context.install(sessionPlugin),
        context.install(rendererPlugin, config),
        context.install(interactionPlugin),
        context.install(historyPlugin),
      ];
      await Promise.all(installations.map((installation) => installation.whenActive()));
    },
  });
}
