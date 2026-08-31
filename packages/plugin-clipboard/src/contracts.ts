import type {
  CanvasFragment,
  CanvasFragmentIdMaterialization,
  CanvasFragmentSelection,
} from '@nodebraid/canvas-fragment';
import type { CanvasCommit, Point } from '@nodebraid/kernel';
import type { InteractionKeyboardShortcut } from '@nodebraid/plugin-interaction';

export interface ClipboardTextTransport {
  readText(signal: AbortSignal): PromiseLike<string>;
  writeText(text: string, signal: AbortSignal): PromiseLike<void>;
}

export interface CanvasFragmentTextCodec {
  encode(fragment: CanvasFragment): string;
  decode(text: string): unknown;
}

export interface ClipboardIdMaterializationInput {
  readonly nodeIds: CanvasFragmentSelection['nodeIds'];
  readonly edgeIds: CanvasFragmentSelection['edgeIds'];
}

export type ClipboardIdMaterializer = (input: ClipboardIdMaterializationInput) => CanvasFragmentIdMaterialization;

export interface CreateClipboardPluginOptions {
  readonly transport: ClipboardTextTransport;
  readonly codec: CanvasFragmentTextCodec;
  readonly materializeIds: ClipboardIdMaterializer;
  readonly offset?: Point;
}

export interface CreateClipboardShortcutPluginOptions {
  readonly copyShortcut?: InteractionKeyboardShortcut;
  readonly pasteShortcut?: InteractionKeyboardShortcut;
}

export type ClipboardCopyResult = CanvasFragment | null;
export type ClipboardPasteResult = CanvasCommit;
