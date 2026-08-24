import { expect, test } from 'bun:test';

import type { DiagnosticFault } from '@nodebraid/diagnostics';
import { nodeId } from '@nodebraid/kernel';
import { commandPlugin } from '@nodebraid/plugin-command';
import { kernelPlugin } from '@nodebraid/plugin-kernel';
import { createRendererPlugin } from '@nodebraid/plugin-renderer';
import { sessionPlugin } from '@nodebraid/plugin-session';
import type {
  CanvasRenderer,
  HitResult,
  RendererDocumentUpdate,
  RendererInput,
  RendererInputListener,
  ScreenPoint,
} from '@nodebraid/renderer-api';
import type { SessionSnapshot } from '@nodebraid/session-api';
import { createPluginHost } from '@nodebraid/runtime-cordis';

import { interactionPlugin } from '../src';

test('a failed Selection transition releases Pointer Capture before reporting the Input fault', async () => {
  const faults: DiagnosticFault[] = [];
  const renderer = new FaultInjectionRenderer();
  const host = createPluginHost({ diagnostics: { faultReporter: (fault) => faults.push(fault) } });
  const installations = [
    host.install(kernelPlugin),
    host.install(commandPlugin),
    host.install(sessionPlugin),
    host.install(createRendererPlugin(() => renderer)),
    host.install(interactionPlugin),
  ];
  await Promise.all(installations.map((installation) => installation.whenActive()));

  renderer.emit({
    type: 'pointer.down',
    pointerId: 7,
    pointerType: 'mouse',
    screenPoint: { x: 10, y: 20 },
    worldPoint: { x: 10, y: 20 },
    button: 'primary',
    pressedButtons: ['primary'],
    modifiers: { alt: false, control: false, meta: false, shift: false },
  });

  expect(renderer.controls).toEqual(['focus', 'capture:7', 'release:7']);
  expect(faults).toHaveLength(1);
  await host.dispose();
});

class FaultInjectionRenderer implements CanvasRenderer {
  readonly controls: string[] = [];
  readonly #listeners = new Set<RendererInputListener>();

  updateDocument(_update: RendererDocumentUpdate): void {}
  updateSession(_snapshot: SessionSnapshot): void {}
  updateInteraction(): void {}

  subscribeInput(listener: RendererInputListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  hitTest(_point: ScreenPoint): HitResult {
    return { type: 'node', nodeId: nodeId('missing-node'), worldPoint: { x: 10, y: 20 } };
  }

  capturePointer(pointerId: number): void {
    this.controls.push(`capture:${pointerId}`);
  }

  releasePointer(pointerId: number): void {
    this.controls.push(`release:${pointerId}`);
  }

  focus(): void {
    this.controls.push('focus');
  }

  dispose(): Promise<void> {
    this.#listeners.clear();
    return Promise.resolve();
  }

  emit(input: RendererInput): void {
    for (const listener of this.#listeners) listener(input);
  }
}
