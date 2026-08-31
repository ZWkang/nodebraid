import {
  acceptCanvasFragment,
  type CanvasFragment,
  type CanvasFragmentTextCodec,
  type ClipboardTextTransport,
} from '@nodebraid/core';

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
    assertNullData(fragment);
    return JSON.stringify({
      type: nodeBraidExampleClipboardType,
      version: nodeBraidExampleClipboardVersion,
      fragment,
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
    const fragment = acceptCanvasFragment(envelope.fragment);
    assertNullData(fragment);
    return fragment;
  },
});

function assertNullData(fragment: CanvasFragment): void {
  if (fragment.nodes.some((node) => node.data !== null) || fragment.edges.some((edge) => edge.data !== null)) {
    throw new Error('The Basic SVG Example Clipboard codec accepts only null Node and Edge data.');
  }
}

function isExactRecord(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const ownKeys = Reflect.ownKeys(value);
  return ownKeys.length === keys.length && ownKeys.every((key) => typeof key === 'string' && keys.includes(key));
}
