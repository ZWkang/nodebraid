import {
  acceptCanvasFragment,
  type CanvasFragment,
  type CanvasFragmentTextCodec,
  type ClipboardTextTransport,
} from '@nodebraid/core';

import { acceptExampleData } from './example-data-codec';

export const nodeBraidExampleClipboardType = 'nodebraid.examples/canvas-fragment';
export const nodeBraidExampleClipboardVersion = 1;

export function createNavigatorClipboardTransport(): ClipboardTextTransport {
  const clipboard = navigator.clipboard;
  if (!clipboard || typeof clipboard.readText !== 'function' || typeof clipboard.writeText !== 'function') {
    throw new Error('The Examples Application requires navigator.clipboard text access.');
  }
  return Object.freeze({
    async readText(signal: AbortSignal): Promise<string> {
      signal.throwIfAborted();
      const text = await clipboard.readText();
      signal.throwIfAborted();
      return text;
    },
    async writeText(text: string, signal: AbortSignal): Promise<void> {
      signal.throwIfAborted();
      await clipboard.writeText(text);
      signal.throwIfAborted();
    },
  });
}

export const exampleCanvasFragmentTextCodec: CanvasFragmentTextCodec = Object.freeze({
  encode(fragment: CanvasFragment): string {
    return JSON.stringify({
      type: nodeBraidExampleClipboardType,
      version: nodeBraidExampleClipboardVersion,
      fragment: withExampleData(fragment),
    });
  },
  decode(text: string): CanvasFragment {
    const envelope = JSON.parse(text) as unknown;
    if (!isExactRecord(envelope, ['type', 'version', 'fragment'])) {
      throw new Error('Clipboard text is not a NodeBraid Examples Canvas Fragment envelope.');
    }
    if (envelope.type !== nodeBraidExampleClipboardType || envelope.version !== nodeBraidExampleClipboardVersion) {
      throw new Error('Clipboard text uses an unsupported NodeBraid Examples Canvas Fragment envelope.');
    }
    return withExampleData(acceptCanvasFragment(envelope.fragment));
  },
});

function withExampleData(fragment: CanvasFragment): CanvasFragment {
  return Object.freeze({
    ...fragment,
    nodes: Object.freeze(fragment.nodes.map((node) => Object.freeze({ ...node, data: acceptExampleData(node.data) }))),
    edges: Object.freeze(fragment.edges.map((edge) => Object.freeze({ ...edge, data: acceptExampleData(edge.data) }))),
  });
}

function isExactRecord(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const ownKeys = Reflect.ownKeys(value);
  return ownKeys.length === keys.length && ownKeys.every((key) => typeof key === 'string' && keys.includes(key));
}
