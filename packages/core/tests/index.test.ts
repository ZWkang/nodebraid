import { describe, expect, test } from 'bun:test';

import { createPluginHost, definePlugin, defineService, type PluginInstallation } from '../src';

describe('@cflow/core', () => {
  test('publishes the typed Plugin Host seam', async () => {
    const input = defineService<{ read(): number }>('input');
    const output = defineService<{ value: number }>('output');
    const typedPlugin = definePlugin({
      requires: { input },
      provides: { output },
      setup(context, config: { multiplier: number }) {
        const value: number = context.services.input.read();
        // @ts-expect-error Undeclared Required Services stay unavailable through core.
        void context.services.undeclared;
        return { output: { value: value * config.multiplier } };
      },
    });
    const verifyTypes = () => {
      const host = createPluginHost();
      // @ts-expect-error Plugin configuration stays required through core.
      host.install(typedPlugin);
      const installation: PluginInstallation = host.install(typedPlugin, {
        multiplier: 2,
      });
      definePlugin({
        provides: { output },
        // @ts-expect-error Every Provided Service stays required through core.
        setup() {
          return {};
        },
      });
      void installation;
    };
    void verifyTypes;

    let disposed = false;
    const plugin = definePlugin({
      setup(context) {
        context.own(() => {
          disposed = true;
        });
      },
    });
    const host = createPluginHost();

    const installation = host.install(plugin);
    await installation.whenActive();

    expect(installation.getSnapshot()).toEqual({ status: 'active' });

    await host.dispose();
    expect(disposed).toBe(true);
    expect(installation.getSnapshot()).toEqual({ status: 'disposed' });
  });
});
