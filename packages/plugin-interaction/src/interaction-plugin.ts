import { connectionFeedbackService } from './connection-feedback';
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

// Existing fields are validated on every Activation. Only the rule has Installation lifetime.
class InstallationConfig implements InteractionConfig {
  readonly connectionRule: InteractionConfig['connectionRule'];
  constructor(readonly original: InteractionConfig | undefined) {
    this.connectionRule = original?.connectionRule;
  }
}

export const interactionPlugin = definePlugin({
  name: '@nodebraid/plugin-interaction',
  requires: {
    renderer: rendererService,
    session: sessionService,
    commands: commandService,
    kernel: kernelService,
    ports: portService,
  },
  provides: {
    feedback: connectionFeedbackService,
    shortcuts: interactionShortcutService,
    placement: nodePlacementService,
  },
  captureConfig(config: InteractionConfig | undefined): InteractionConfig {
    return new InstallationConfig(config);
  },
  setup(context, providedConfig: InteractionConfig | undefined) {
    if (!(providedConfig instanceof InstallationConfig)) throw new Error('Missing Installation configuration.');
    return activateInteractionRuntime(
      context,
      resolveInteractionConfig(providedConfig.original, providedConfig.connectionRule),
    );
  },
});
