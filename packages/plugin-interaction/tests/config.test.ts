import { expect, test } from 'bun:test';

import { commandPlugin } from '@nodebraid/plugin-command';
import { kernelPlugin } from '@nodebraid/plugin-kernel';
import { portPlugin } from '@nodebraid/plugin-port';
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
    host.install(portPlugin),
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
    host.install(portPlugin),
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
    host.install(portPlugin),
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
    {
      connection: {
        get materializeEdge() {
          return null;
        },
      },
    },
    {
      connection: {
        get materializeEdge(): never {
          throw new Error('Unknown Connection fields must be rejected before reading the materializer.');
        },
        unexpected: true,
      },
    },
  ];
  for (const config of invalidConfigs) {
    const interaction = host.install(interactionPlugin, config as never);
    await expect(interaction.whenActive()).rejects.toMatchObject({
      domain: 'interaction',
      code: 'INVALID_CONFIG',
    });
    await interaction.dispose();
  }

  await host.dispose();
});

test('Interaction revalidates the materializer on recovery and preserves its read failure', async () => {
  const host = createPluginHost();
  const originalError = new Error('recovered Connection materializer read failed');
  let reads = 0;
  const renderer = host.install(createRendererPlugin(() => new ConfigRenderer()));
  const interaction = host.install(interactionPlugin, {
    connection: {
      get materializeEdge() {
        reads += 1;
        if (reads === 1) {
          return () => {
            throw new Error('Connection materialization is not requested by this recovery test.');
          };
        }
        throw originalError;
      },
    },
  });
  const installations = [
    host.install(kernelPlugin),
    host.install(portPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    renderer,
    interaction,
  ];

  try {
    await Promise.all(installations.map((installation) => installation.whenActive()));
    expect(reads).toBe(1);
    await renderer.dispose();
    expect(interaction.getSnapshot().status).toBe('pending');
    const replacement = host.install(createRendererPlugin(() => new ConfigRenderer()));
    await replacement.whenActive();
    const error = await interaction.whenActive().catch((reason: unknown) => reason);
    expect(error).toBe(originalError);
    expect(reads).toBe(2);
    expect(interaction.getSnapshot()).toEqual({ status: 'failed', error: originalError });
  } finally {
    await host.dispose();
  }
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
