import { test } from 'bun:test';

import type { CanvasRenderer, RendererFactory } from '@cflow/renderer-api';
import type { Plugin } from '@cflow/runtime-cordis';

import { createRendererPlugin, type RendererService } from '../src';

test('binds Provider config without exposing CanvasRenderer update authority', () => {
  type Config = { readonly target: string };
  const verifyFactory = (factory: RendererFactory<Config>) => {
    const plugin: Plugin<Config> = createRendererPlugin(factory);
    return plugin;
  };
  const verifyService = (service: RendererService, renderer: CanvasRenderer) => {
    service.focus();
    // @ts-expect-error State projection belongs only to the CanvasRenderer Provider seam.
    service.updateDocument(renderer);
    // @ts-expect-error Renderer disposal belongs to Plugin Activation ownership.
    service.dispose();
  };
  void verifyFactory;
  void verifyService;
});
