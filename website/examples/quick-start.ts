import { createPluginHost, definePlugin, kernelPlugin, kernelService, nodeId } from '@nodebraid/core';

const appPlugin = definePlugin({
  name: 'docs.quick-start',
  requires: { kernel: kernelService },
  setup(context) {
    const commit = context.services.kernel.transact((transaction) => {
      transaction.nodes.add({
        id: nodeId('welcome'),
        type: 'task',
        position: { x: 0, y: 0 },
        data: null,
      });
    });

    if (!commit) throw new Error('Expected the Quick Start transaction to commit.');

    console.log(`revision=${commit.after.snapshot.revision} nodes=${commit.after.snapshot.nodes.length}`);
  },
});

const host = createPluginHost();

try {
  host.install(kernelPlugin);
  const app = host.install(appPlugin);
  await app.whenActive();
} finally {
  await host.dispose();
}
