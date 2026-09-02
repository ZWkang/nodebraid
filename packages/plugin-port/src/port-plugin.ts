import { definePlugin, defineService } from '@nodebraid/runtime-cordis';

import type { PortContribution, PortService } from './contracts';
import { createPortRuntime } from './port-runtime';

export const portService = defineService<PortService>('ports');

export const portPlugin = definePlugin({
  name: '@nodebraid/plugin-port',
  provides: { ports: portService },
  setup(context) {
    const runtime = createPortRuntime(context.diagnostics);
    context.own(runtime.dispose);
    return { ports: runtime.service };
  },
});

export function createPortContributionPlugin(contribution: PortContribution) {
  return definePlugin({
    name: '@nodebraid/plugin-port/contribution',
    requires: { ports: portService },
    setup(context) {
      const registration = context.services.ports.register(contribution);
      context.own(() => registration.dispose());
    },
  });
}
