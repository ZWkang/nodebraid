import { expect, test } from 'bun:test';

import { commandPlugin } from '@nodebraid/plugin-command';
import { kernelPlugin } from '@nodebraid/plugin-kernel';
import { createRendererPlugin } from '@nodebraid/plugin-renderer';
import { sessionPlugin } from '@nodebraid/plugin-session';
import type {
  CanvasRenderer,
  HitResult,
  RendererDocumentUpdate,
  RendererInputListener,
  ScreenPoint,
} from '@nodebraid/renderer-api';
import type { SessionSnapshot } from '@nodebraid/session-api';
import { createPluginHost } from '@nodebraid/runtime-cordis';

import { interactionPlugin } from '../src';

test('Interaction accepts an explicit synchronous Connection materializer', async () => {
  const host = createPluginHost();
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createRendererPlugin(() => new ConfigRenderer())),
  ];
  const interaction = host.install(interactionPlugin, {
    connection: {
      materializeEdge({ source, target }) {
        return { id: 'connection' as never, type: 'flow', source, target, data: null };
      },
    },
  });

  await Promise.all([...installations, interaction].map((installation) => installation.whenActive()));
  expect(interaction.getSnapshot()).toEqual({ status: 'active' });
  await host.dispose();
});

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
    { connection: null },
    { connection: {} },
    { connection: { materializeEdge: 'not-a-function' } },
    { connection: { materializeEdge: () => undefined, unexpected: true } },
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
