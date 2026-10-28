import { commandService } from '@nodebraid/plugin-command';
import { kernelService } from '@nodebraid/plugin-kernel';
import { portService } from '@nodebraid/plugin-port';
import { rendererService } from '@nodebraid/plugin-renderer';
import { sessionService } from '@nodebraid/plugin-session';
import { definePlugin } from '@nodebraid/runtime-cordis';

import type { InteractionConfig } from './contracts';
import { resolveInteractionConfig } from './interaction-config';
import { activateInteractionRuntime } from './interaction-runtime';
import { interactionShortcutService } from './shortcut-service';
import { nodePlacementService } from './node-placement';

export const interactionPlugin = definePlugin({
  name: '@nodebraid/plugin-interaction',
  requires: {
    renderer: rendererService,
    session: sessionService,
    commands: commandService,
    kernel: kernelService,
    ports: portService,
  },
  provides: { shortcuts: interactionShortcutService, placement: nodePlacementService },
  setup(context, providedConfig: InteractionConfig | undefined) {
    return activateInteractionRuntime(context, resolveInteractionConfig(providedConfig));
  },
});
