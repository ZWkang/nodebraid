import { expect, test } from 'bun:test';

import { commandPlugin } from '@cflow/plugin-command';
import { kernelPlugin } from '@cflow/plugin-kernel';
import { createRendererPlugin } from '@cflow/plugin-renderer';
import { sessionPlugin } from '@cflow/plugin-session';
import type {
  CanvasRenderer,
  HitResult,
  RendererDocumentUpdate,
  RendererInputListener,
  ScreenPoint,
} from '@cflow/renderer-api';
import type { SessionSnapshot } from '@cflow/session-api';
import { createPluginHost } from '@cflow/runtime-cordis';

import { interactionPlugin } from '../src';

test('Interaction rejects unknown config fields through Plugin installation', async () => {
  const host = createPluginHost();
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createRendererPlugin(() => new ConfigRenderer())),
  ];
  const interaction = host.install(interactionPlugin, { dragThreshold: 4, unexpected: true } as never);

  await Promise.all(installations.map((installation) => installation.whenActive()));
  await expect(interaction.whenActive()).rejects.toMatchObject({
    domain: 'interaction',
    code: 'INVALID_CONFIG',
  });
  await host.dispose();
});

test('Interaction rejects malformed numeric config without coercion', async () => {
  const host = createPluginHost();
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createRendererPlugin(() => new ConfigRenderer())),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));

  const invalidConfigs = [
    null,
    { dragThreshold: -1 },
    { dragThreshold: Number.NaN },
    { wheelZoomSensitivity: 0 },
    { wheelZoomSensitivity: Number.POSITIVE_INFINITY },
    { minZoom: 0 },
    { maxZoom: Number.POSITIVE_INFINITY },
    { minZoom: 2, maxZoom: 1 },
    { dragThreshold: '4' },
  ];
  for (const config of invalidConfigs) {
    const interaction = host.install(interactionPlugin, config as never);
    await expect(interaction.whenActive()).rejects.toMatchObject({
      domain: 'interaction',
      code: 'INVALID_CONFIG',
    });
  }

  await host.dispose();
});

class ConfigRenderer implements CanvasRenderer {
  updateDocument(_update: RendererDocumentUpdate): void {}
  updateSession(_snapshot: SessionSnapshot): void {}
  updateInteraction(): void {}
  subscribeInput(_listener: RendererInputListener): () => void {
    return () => {};
  }
  hitTest(_point: ScreenPoint): HitResult | null {
    return null;
  }
  capturePointer(_pointerId: number): void {}
  releasePointer(_pointerId: number): void {}
  focus(): void {}
  dispose(): Promise<void> {
    return Promise.resolve();
  }
}
