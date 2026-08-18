import { test } from 'bun:test';

import { createPluginHost, definePlugin } from '@cflow/runtime-cordis';

import { kernelPlugin, kernelService, type KernelService } from '../src';

test('keeps the public Kernel Service contract type-safe', () => {
  const verifyTypes = () => {
    const consumer = definePlugin({
      requires: { kernel: kernelService },
      setup(context) {
        const service: KernelService = context.services.kernel;
        const view = service.read();
        // @ts-expect-error Kernel Service reads stay immutable.
        view.snapshot.revision = 2;
        service.observeCommits((commit) => {
          // @ts-expect-error Commit Change Sets stay immutable.
          commit.changeSet.changes.push(commit.changeSet.changes[0]);
        });
        service.transact((transaction) => {
          void transaction.query;
        });
        // @ts-expect-error Lifecycle disposal belongs to the Plugin Activation.
        service.dispose();
      },
    });
    const host = createPluginHost();
    host.install(kernelPlugin);
    host.install(consumer);
    // @ts-expect-error The official Kernel Plugin has no configuration.
    host.install(kernelPlugin, {});
  };

  void verifyTypes;
});
