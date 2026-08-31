import {
  acceptCanvasFragment,
  CanvasFragmentError,
  captureCanvasFragment,
  materializeCanvasFragment,
} from '@nodebraid/canvas-fragment';
import type { CanvasCommit } from '@nodebraid/kernel';
import { defineCommand, type CommandHandler } from '@nodebraid/plugin-command';
import type { KernelService } from '@nodebraid/plugin-kernel';
import type { SessionService } from '@nodebraid/plugin-session';

import { ClipboardError } from './clipboard-error';
import type { ClipboardCopyResult, ClipboardPasteResult, CreateClipboardPluginOptions } from './contracts';

export const copySelectionToClipboardCommand = defineCommand<void, ClipboardCopyResult>('clipboard.copy');
export const pasteClipboardCommand = defineCommand<void, CanvasCommit>('clipboard.paste');

export function createCopySelectionToClipboardHandler(
  kernel: KernelService,
  session: SessionService,
  options: Readonly<Required<CreateClipboardPluginOptions>>,
): CommandHandler<void, ClipboardCopyResult> {
  return async (_input, execution) => {
    execution.signal.throwIfAborted();
    const selection = session.getSnapshot().selection;
    const fragment = captureCanvasFragment(kernel.read(), selection);
    if (!fragment) return null;
    let text: string;
    try {
      text = options.codec.encode(fragment);
    } catch (error) {
      throw new ClipboardError(
        'CODEC_ENCODE_FAILED',
        'Clipboard codec could not encode the Canvas Fragment.',
        {},
        {
          cause: error,
        },
      );
    }
    if (typeof text !== 'string') {
      throw new ClipboardError('CODEC_ENCODE_FAILED', 'Clipboard codec must encode the Canvas Fragment as text.');
    }
    execution.signal.throwIfAborted();
    try {
      await options.transport.writeText(text, execution.signal);
    } catch (error) {
      if (execution.signal.aborted && error === execution.signal.reason) throw error;
      throw new ClipboardError(
        'TRANSPORT_WRITE_FAILED',
        'Clipboard transport could not write text.',
        {},
        {
          cause: error,
        },
      );
    }
    execution.signal.throwIfAborted();
    return fragment;
  };
}

export function createPasteClipboardHandler(
  kernel: KernelService,
  session: SessionService,
  options: Readonly<Required<CreateClipboardPluginOptions>>,
): CommandHandler<void, ClipboardPasteResult> {
  return async (_input, execution) => {
    execution.signal.throwIfAborted();
    let text: string;
    try {
      text = await options.transport.readText(execution.signal);
    } catch (error) {
      if (execution.signal.aborted && error === execution.signal.reason) throw error;
      throw new ClipboardError(
        'TRANSPORT_READ_FAILED',
        'Clipboard transport could not read text.',
        {},
        {
          cause: error,
        },
      );
    }
    execution.signal.throwIfAborted();
    if (typeof text !== 'string') {
      throw new ClipboardError('TRANSPORT_READ_FAILED', 'Clipboard transport must read text.');
    }
    let decoded: unknown;
    try {
      decoded = options.codec.decode(text);
    } catch (error) {
      throw new ClipboardError('CODEC_DECODE_FAILED', 'Clipboard codec could not decode text.', {}, { cause: error });
    }
    let fragment;
    try {
      fragment = acceptCanvasFragment(decoded);
    } catch (error) {
      if (error instanceof CanvasFragmentError && error.code === 'INVALID_FRAGMENT') {
        throw new ClipboardError(
          'INVALID_FRAGMENT',
          'Clipboard text did not contain a valid Canvas Fragment.',
          {},
          {
            cause: error,
          },
        );
      }
      throw error;
    }
    execution.signal.throwIfAborted();
    let rawMaterialization;
    try {
      rawMaterialization = options.materializeIds(
        Object.freeze({
          nodeIds: fragment.selection.nodeIds,
          edgeIds: Object.freeze(fragment.edges.map((edge) => edge.id)),
        }),
      );
    } catch (error) {
      throw new ClipboardError('INVALID_MATERIALIZATION', 'Clipboard ID materializer failed.', {}, { cause: error });
    }
    let asynchronousMaterialization: boolean;
    try {
      asynchronousMaterialization = isThenable(rawMaterialization);
    } catch (error) {
      throw new ClipboardError(
        'INVALID_MATERIALIZATION',
        'Clipboard ID materialization is malformed.',
        {},
        {
          cause: error,
        },
      );
    }
    if (asynchronousMaterialization) {
      throw new ClipboardError('INVALID_MATERIALIZATION', 'Clipboard ID materializer must be synchronous.');
    }
    let materialized;
    try {
      materialized = materializeCanvasFragment(fragment, rawMaterialization, options.offset);
    } catch (error) {
      if (error instanceof CanvasFragmentError && error.code === 'INVALID_MATERIALIZATION') {
        throw new ClipboardError(
          'INVALID_MATERIALIZATION',
          'Clipboard ID materialization is invalid.',
          {},
          {
            cause: error,
          },
        );
      }
      throw error;
    }
    execution.signal.throwIfAborted();
    const selection = session.getSnapshot().selection;
    let commit: CanvasCommit | null;
    try {
      commit = kernel.transact(
        (transaction) => {
          if (session.getSnapshot().selection !== selection) throwTargetConflict('Clipboard Paste Selection changed.');
          const materializedNodeIds = new Set(materialized.nodes.map((node) => node.id));
          for (const node of materialized.nodes) {
            if (transaction.query.getNode(node.id)) throwTargetConflict('Clipboard Paste Node ID is unavailable.');
            if (
              node.parentId !== undefined &&
              !materializedNodeIds.has(node.parentId) &&
              !transaction.query.getNode(node.parentId)
            ) {
              throwTargetConflict('Clipboard Paste external parent is unavailable.');
            }
          }
          for (const edge of materialized.edges) {
            if (transaction.query.getEdge(edge.id)) throwTargetConflict('Clipboard Paste Edge ID is unavailable.');
          }
          for (const node of materialized.nodes) transaction.nodes.add(node);
          for (const edge of materialized.edges) transaction.edges.add(edge);
        },
        { origin: 'clipboard-paste', commandId: execution.commandId },
      );
    } catch (error) {
      if (error instanceof ClipboardError) throw error;
      throw new ClipboardError(
        'COMMIT_FAILED',
        'Clipboard Paste could not commit the Canvas Fragment.',
        {},
        {
          cause: error,
        },
      );
    }
    if (!commit) throw new ClipboardError('COMMIT_FAILED', 'Clipboard Paste must create a Canvas Commit.');
    let currentSelection;
    try {
      currentSelection = session.getSnapshot().selection;
    } catch (error) {
      throwSelectionUpdateFailed(commit.changeSet.revision, error);
    }
    if (currentSelection !== selection) throwSelectionUpdateFailed(commit.changeSet.revision);
    try {
      session.setSelection(materialized.selection);
    } catch (error) {
      throwSelectionUpdateFailed(commit.changeSet.revision, error);
    }
    return commit;
  };
}

function isThenable(value: unknown): boolean {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    typeof Reflect.get(value, 'then') === 'function'
  );
}

function throwTargetConflict(message: string): never {
  throw new ClipboardError('TARGET_CONFLICT', message);
}

function throwSelectionUpdateFailed(committedRevision: number, cause?: unknown): never {
  throw new ClipboardError(
    'SELECTION_UPDATE_FAILED',
    'Clipboard Paste committed but could not apply its result Selection.',
    { committedRevision },
    { cause },
  );
}
