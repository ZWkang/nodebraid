import { commandService } from '@cflow/plugin-command';
import { kernelService } from '@cflow/plugin-kernel';
import { rendererService } from '@cflow/plugin-renderer';
import { sessionService } from '@cflow/plugin-session';
import { definePlugin } from '@cflow/runtime-cordis';

import type { InteractionConfig } from './contracts';
import { resolveInteractionConfig } from './interaction-config';
import { activateInteractionRuntime } from './interaction-runtime';

export const interactionPlugin = definePlugin({
  name: '@cflow/plugin-interaction',
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
