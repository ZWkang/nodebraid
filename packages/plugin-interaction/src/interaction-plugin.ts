import { commandService } from '@nodebraid/plugin-command';
import { kernelService } from '@nodebraid/plugin-kernel';
import { rendererService } from '@nodebraid/plugin-renderer';
import { sessionService } from '@nodebraid/plugin-session';
import { definePlugin } from '@nodebraid/runtime-cordis';

import type { InteractionConfig } from './contracts';
import { resolveInteractionConfig } from './interaction-config';
import { activateInteractionRuntime } from './interaction-runtime';

export const interactionPlugin = definePlugin({
  name: '@nodebraid/plugin-interaction',
  requires: {
    renderer: rendererService,
    session: sessionService,
    commands: commandService,
    kernel: kernelService,
  },
  setup(context, providedConfig: InteractionConfig | undefined) {
    activateInteractionRuntime(context, resolveInteractionConfig(providedConfig));
  },
});
