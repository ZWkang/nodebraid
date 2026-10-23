import { expect, test } from 'bun:test';
import { InteractionError, type InteractionConfig } from '@nodebraid/plugin-interaction';
import type { SessionSnapshot } from '@nodebraid/plugin-session';
import type { RendererInput, RendererInputListener } from '@nodebraid/renderer-api';
import { createPluginHost } from '@nodebraid/runtime-cordis';
import { createBasicCanvasPlugin } from '../src';
import { TestCanvasRenderer } from './test-renderer';

const fields = [
  ['dragThreshold', -1],
  ['wheelZoomSensitivity', 0],
  ['minZoom', 0],
  ['maxZoom', 0],
] as const;
const propertyKinds = ['enumerable', 'inherited', 'non-enumerable'] as const;

for (const [field, invalid] of fields) {
  test.each([...propertyKinds])(`Composition preserves invalid ${field} from %s policy fields`, async (kind) => {
    const properties = { [field]: { get: () => invalid, enumerable: kind === 'enumerable' } };
    const interaction: InteractionConfig =
      kind === 'inherited'
        ? Object.create(Object.defineProperties({}, properties))
        : Object.defineProperties({}, properties);
    const plugin = createBasicCanvasPlugin(() => new TestCanvasRenderer(), { interaction });
    const host = createPluginHost();
    const composition = host.install(plugin);
    try {
      const error = await composition.whenActive().catch((reason: unknown) => reason);
      expect(error).toBeInstanceOf(InteractionError);
      expect(error).toMatchObject({ domain: 'interaction', code: 'INVALID_CONFIG' });
      expect(composition.getSnapshot()).toEqual({ status: 'failed', error });
    } finally {
      await host.dispose();
    }
  });
}

test.each([...propertyKinds])('Composition retains valid %s policies across mutation and fresh Hosts', async (kind) => {
  const values = { dragThreshold: 12, wheelZoomSensitivity: 0.01, minZoom: 0.8, maxZoom: 1.5 };
  const reads = { dragThreshold: 0, wheelZoomSensitivity: 0, minZoom: 0, maxZoom: 0 };
  const properties = Object.fromEntries(
    fields.map(([field]) => [
      field,
      {
        enumerable: kind === 'enumerable',
        get() {
          reads[field] += 1;
          return values[field];
        },
      },
    ]),
  );
  const interaction: InteractionConfig =
    kind === 'inherited'
      ? Object.create(Object.defineProperties({}, properties))
      : Object.defineProperties({}, properties);
  let renderer: PolicyRenderer;
  const plugin = createBasicCanvasPlugin(() => (renderer = new PolicyRenderer()), { interaction });
  expect(reads).toEqual({ dragThreshold: 1, wheelZoomSensitivity: 1, minZoom: 1, maxZoom: 1 });
  for (const [field] of fields) values[field] = -1;

  for (let generation = 0; generation < 2; generation += 1) {
    const host = createPluginHost();
    const composition = host.install(plugin);
    try {
      await composition.whenActive();
      const current = renderer!;
      current.wheel(-10);
      expect(current.snapshot!.viewport.zoom).toBeCloseTo(1.1051709180756477, 12);
      current.wheel(-1000);
      expect(current.snapshot!.viewport.zoom).toBe(1.5);
      current.wheel(1000);
      expect(current.snapshot!.viewport.zoom).toBe(0.8);
      const beforePan = current.snapshot;
      current.pan(6);
      expect(current.snapshot).toBe(beforePan);
      current.pan(20);
      expect(current.snapshot!.viewport).toEqual({ x: 20, y: 0, zoom: 0.8 });
    } finally {
      await host.dispose();
    }
    expect(renderer!.disposed).toBeTrue();
  }
  expect(reads).toEqual({ dragThreshold: 1, wheelZoomSensitivity: 1, minZoom: 1, maxZoom: 1 });
});

for (const [field] of fields) {
  test.each([...propertyKinds])(`Composition preserves the original %s ${field} getter failure`, (kind) => {
    const original = new Error(`${field} read failed`);
    const properties = {
      [field]: {
        enumerable: kind === 'enumerable',
        get(): never {
          throw original;
        },
      },
    };
    const interaction: InteractionConfig =
      kind === 'inherited'
        ? Object.create(Object.defineProperties({}, properties))
        : Object.defineProperties({}, properties);
    let actual: unknown;
    try {
      createBasicCanvasPlugin(() => new TestCanvasRenderer(), { interaction });
    } catch (error) {
      actual = error;
    }
    expect(actual).toBe(original);
  });
}

class PolicyRenderer extends TestCanvasRenderer {
  snapshot?: SessionSnapshot;
  #listener?: RendererInputListener;

  override updateSession(snapshot: SessionSnapshot): void {
    this.snapshot = snapshot;
  }
  override subscribeInput(listener: RendererInputListener): () => void {
    this.#listener = listener;
    return () => {
      this.#listener = undefined;
    };
  }
  wheel(deltaY: number): void {
    this.#send({
      type: 'wheel',
      deltaX: 0,
      deltaY,
      screenPoint: { x: 0, y: 0 },
      worldPoint: { x: 0, y: 0 },
      modifiers,
    });
  }
  pan(distance: number): void {
    for (const [type, x] of [
      ['pointer.down', 0],
      ['pointer.move', distance],
      ['pointer.up', distance],
    ] as const) {
      this.#send({
        type,
        pointerId: 1,
        pointerType: 'mouse',
        button: 'auxiliary',
        pressedButtons: type === 'pointer.up' ? [] : ['auxiliary'],
        screenPoint: { x, y: 0 },
        worldPoint: { x: x / this.snapshot!.viewport.zoom, y: 0 },
        modifiers,
      });
    }
  }
  #send(input: RendererInput): void {
    if (!this.#listener) throw new Error('Interaction must subscribe before the policy input probe.');
    this.#listener(input);
  }
}

const modifiers = Object.freeze({ alt: false, control: false, meta: false, shift: false });
