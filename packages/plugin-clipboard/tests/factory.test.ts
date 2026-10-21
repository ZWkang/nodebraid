import { expect, test } from 'bun:test';

import type { CanvasFragment } from '@nodebraid/canvas-fragment';
import { nodeId, type Point } from '@nodebraid/kernel';
import { commandPlugin, commandService, type CommandService } from '@nodebraid/plugin-command';
import { kernelPlugin, kernelService, type KernelService } from '@nodebraid/plugin-kernel';
import { sessionPlugin, sessionService, type SessionService } from '@nodebraid/plugin-session';
import { createPluginHost, definePlugin, type Plugin } from '@nodebraid/runtime-cordis';

import {
  copySelectionToClipboardCommand,
  createClipboardPlugin,
  pasteClipboardCommand,
  type CreateClipboardPluginOptions,
} from '../src';

const capturedProperties: string[] = [
  'transport',
  'readText',
  'writeText',
  'codec',
  'encode',
  'decode',
  'materializeIds',
  'offset',
  'x',
  'y',
];

test.each(capturedProperties)('Copy and Paste retain the accepted %s property', async (property) => {
  const options = createOptions();
  const owner = propertyOwner(options, property);
  const accepted = Reflect.get(owner, property);
  let reads = 0;
  Object.defineProperty(owner, property, {
    get() {
      reads += 1;
      return reads === 1 ? accepted : undefined;
    },
  });

  await copyAndPaste(createClipboardPlugin(options), { x: 10, y: 16 });

  expect(reads).toBe(1);
});

test.each(capturedProperties)('factory keeps the original %s getter exception', (property) => {
  const options = createOptions();
  const owner = propertyOwner(options, property);
  const reason = new Error(`cannot read ${property}`);
  Object.defineProperty(owner, property, {
    get(): never {
      throw reason;
    },
  });

  expect(factoryError(options)).toBe(reason);
});

test.each([
  {
    owner: 'options',
    property: 'transport',
    value: null,
    nextOwner: 'options',
    next: 'codec',
    message: 'Clipboard transport is malformed.',
  },
  {
    owner: 'transport',
    property: 'readText',
    value: null,
    nextOwner: 'transport',
    next: 'writeText',
    message: 'Clipboard transport is malformed.',
  },
  {
    owner: 'transport',
    property: 'writeText',
    value: null,
    nextOwner: 'options',
    next: 'codec',
    message: 'Clipboard transport is malformed.',
  },
  {
    owner: 'options',
    property: 'codec',
    value: null,
    nextOwner: 'options',
    next: 'materializeIds',
    message: 'Clipboard codec is malformed.',
  },
  {
    owner: 'codec',
    property: 'encode',
    value: null,
    nextOwner: 'codec',
    next: 'decode',
    message: 'Clipboard codec is malformed.',
  },
  {
    owner: 'codec',
    property: 'decode',
    value: null,
    nextOwner: 'options',
    next: 'materializeIds',
    message: 'Clipboard codec is malformed.',
  },
  {
    owner: 'options',
    property: 'materializeIds',
    value: null,
    nextOwner: 'options',
    next: 'offset',
    message: 'Clipboard materializeIds must be a function.',
  },
  {
    owner: 'offset',
    property: 'x',
    value: NaN,
    nextOwner: 'offset',
    next: 'y',
    message: 'Clipboard offset must be a finite Point.',
  },
])('factory rejects invalid $property before reading $next', ({ owner, property, value, nextOwner, next, message }) => {
  const options = createOptions();
  const target = owner === 'options' ? options : Reflect.get(options, owner);
  const nextTarget = nextOwner === 'options' ? options : Reflect.get(options, nextOwner);
  Object.defineProperty(target, property, { value });
  Object.defineProperty(nextTarget, next, {
    get(): never {
      throw new Error(`must not read ${next}`);
    },
  });

  expect(factoryError(options)).toMatchObject({ name: 'ClipboardError', code: 'INVALID_CONFIG', message });
});

test('factory rejects unknown fields before invoking configuration getters', () => {
  const options = createOptions();
  Object.defineProperty(options, 'unknown', { value: true });
  Object.defineProperty(options, 'transport', {
    get(): never {
      throw new Error('must not read transport');
    },
  });

  expect(factoryError(options)).toMatchObject({
    name: 'ClipboardError',
    code: 'INVALID_CONFIG',
    message: 'Clipboard options contain an unknown field.',
  });
});

test.each([undefined, null, { x: 0, y: 0 }])(
  'factory preserves omitted, nullish, and zero offsets: %p',
  async (offset) => {
    const options = createOptions();
    Reflect.set(options, 'offset', offset);

    await copyAndPaste(createClipboardPlugin(options), offset == null ? { x: 27, y: 29 } : { x: 3, y: 5 });
  },
);

test('factory owns its accepted shell while keeping application inputs mutable', async () => {
  const options = createOptions();
  const transport = options.transport;
  const codec = options.codec;
  const offset = options.offset!;
  const clipboard = createClipboardPlugin(options);
  for (const input of [options, transport, codec, offset]) expect(Object.isFrozen(input)).toBeFalse();
  const changed = () => {
    throw new Error('later configuration must not replace accepted values');
  };
  Reflect.set(transport, 'readText', changed);
  Reflect.set(transport, 'writeText', changed);
  Reflect.set(codec, 'encode', changed);
  Reflect.set(codec, 'decode', changed);
  Reflect.set(offset, 'x', NaN);
  Reflect.set(offset, 'y', Infinity);
  Reflect.set(options, 'transport', null);
  Reflect.set(options, 'codec', null);
  Reflect.set(options, 'materializeIds', changed);
  Reflect.set(options, 'offset', null);

  await copyAndPaste(clipboard, { x: 10, y: 16 });
});

function propertyOwner(options: CreateClipboardPluginOptions, property: string): object {
  if (property === 'readText' || property === 'writeText') return options.transport;
  if (property === 'encode' || property === 'decode') return options.codec;
  if (property === 'x' || property === 'y') return options.offset!;
  return options;
}

function factoryError(options: CreateClipboardPluginOptions): unknown {
  try {
    createClipboardPlugin(options);
  } catch (error) {
    return error;
  }
  throw new Error('Expected Clipboard factory rejection.');
}

function createOptions(): CreateClipboardPluginOptions {
  let text = '';
  let fragment: CanvasFragment | undefined;
  const transport = {
    async readText() {
      expect(this).toBe(transport);
      return text;
    },
    async writeText(value: string) {
      expect(this).toBe(transport);
      text = value;
    },
  };
  const codec = {
    encode(value: CanvasFragment) {
      expect(this).toBe(codec);
      fragment = value;
      return 'factory-fragment';
    },
    decode(value: string) {
      expect(this).toBe(codec);
      expect(value).toBe('factory-fragment');
      return fragment;
    },
  };
  return {
    transport,
    codec,
    materializeIds: ({ nodeIds }) => ({
      nodes: nodeIds.map((sourceId) => ({ sourceId, materializedId: nodeId('factory-pasted') })),
      edges: [],
    }),
    offset: { x: 7, y: 11 },
  };
}

async function copyAndPaste(clipboard: Plugin, position: Point): Promise<void> {
  const host = createPluginHost();
  try {
    let commands: CommandService | undefined;
    let kernel: KernelService | undefined;
    let session: SessionService | undefined;
    const consumer = definePlugin({
      requires: { commands: commandService, kernel: kernelService, session: sessionService },
      setup(context) {
        commands = context.services.commands;
        kernel = context.services.kernel;
        session = context.services.session;
      },
    });
    const installations = [
      host.install(kernelPlugin),
      host.install(commandPlugin),
      host.install(sessionPlugin),
      host.install(clipboard),
      host.install(consumer),
    ];
    await Promise.all(installations.map((installation) => installation.whenActive()));
    if (!commands || !kernel || !session) throw new Error('Expected Clipboard factory Runtime Services.');
    const source = nodeId('factory-source');
    const pasted = nodeId('factory-pasted');
    kernel.transact((transaction) => {
      transaction.nodes.add({ id: source, type: 'task', position: { x: 3, y: 5 }, data: null });
    });
    session.setSelection({ nodeIds: [source], edgeIds: [] });

    const fragment = await commands.execute(copySelectionToClipboardCommand, undefined);
    expect(fragment?.selection).toEqual({ nodeIds: [source], edgeIds: [] });
    const commit = await commands.execute(pasteClipboardCommand, undefined);

    expect(commit.changeSet).toMatchObject({ beforeRevision: 1, revision: 2, commandId: pasteClipboardCommand.id });
    expect(kernel.read().query.getNode(pasted)?.position).toEqual(position);
    expect(session.getSnapshot().selection).toEqual({ nodeIds: [pasted], edgeIds: [] });
  } finally {
    await host.dispose();
  }
}
