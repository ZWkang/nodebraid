import { expect, test } from 'bun:test';

import type { CanvasRenderer } from '@nodebraid/renderer-api';
import { createPluginHost, type Plugin } from '@nodebraid/runtime-cordis';

import { createBasicCanvasPlugin } from '../src';

test('Basic Canvas Composition preserves required Renderer config and provides no Service', () => {
  interface RequiredRendererConfig {
    readonly targetId: string;
  }

  const renderer = {} as CanvasRenderer;
  const plugin = createBasicCanvasPlugin((_config: Readonly<RequiredRendererConfig>) => renderer);
  const host = createPluginHost();

  const typedPlugin: Plugin<RequiredRendererConfig> = plugin;
  void typedPlugin;
  expect(Object.keys(plugin.provides)).toEqual([]);
  host.install(plugin, { targetId: 'typed-target' });

  const verifyInvalidInstallations = () => {
    // @ts-expect-error Renderer configuration remains required.
    host.install(plugin);
    // @ts-expect-error Provider-specific configuration retains its exact type.
    host.install(plugin, { target: 'wrong-field' });
  };
  void verifyInvalidInstallations;
});
