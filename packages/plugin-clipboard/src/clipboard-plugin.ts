import { commandService } from '@nodebraid/plugin-command';
import { kernelService } from '@nodebraid/plugin-kernel';
import { sessionService } from '@nodebraid/plugin-session';
import { definePlugin } from '@nodebraid/runtime-cordis';

import {
  createCopySelectionToClipboardHandler,
  createPasteClipboardHandler,
  copySelectionToClipboardCommand,
  pasteClipboardCommand,
} from './clipboard-commands';
import { ClipboardError } from './clipboard-error';
import type { CreateClipboardPluginOptions } from './contracts';

export function createClipboardPlugin(options: CreateClipboardPluginOptions) {
  const accepted = acceptOptions(options);
  return definePlugin({
    name: '@nodebraid/plugin-clipboard',
    requires: { commands: commandService, kernel: kernelService, session: sessionService },
    setup(context) {
      const copyRegistration = context.services.commands.register(
        copySelectionToClipboardCommand,
        createCopySelectionToClipboardHandler(context.services.kernel, context.services.session, accepted),
      );
      context.own(() => copyRegistration.dispose());
      const pasteRegistration = context.services.commands.register(
        pasteClipboardCommand,
        createPasteClipboardHandler(context.services.kernel, context.services.session, accepted),
      );
      context.own(() => pasteRegistration.dispose());
    },
  });
}

function acceptOptions(options: CreateClipboardPluginOptions): Readonly<Required<CreateClipboardPluginOptions>> {
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new ClipboardError('INVALID_CONFIG', 'Clipboard options must be an object.');
  }
  for (const key of Reflect.ownKeys(options)) {
    if (key !== 'transport' && key !== 'codec' && key !== 'materializeIds' && key !== 'offset') {
      throw new ClipboardError('INVALID_CONFIG', 'Clipboard options contain an unknown field.');
    }
  }
  if (
    typeof options.transport !== 'object' ||
    options.transport === null ||
    typeof options.transport.readText !== 'function' ||
    typeof options.transport.writeText !== 'function'
  ) {
    throw new ClipboardError('INVALID_CONFIG', 'Clipboard transport is malformed.');
  }
  if (
    typeof options.codec !== 'object' ||
    options.codec === null ||
    typeof options.codec.encode !== 'function' ||
    typeof options.codec.decode !== 'function'
  ) {
    throw new ClipboardError('INVALID_CONFIG', 'Clipboard codec is malformed.');
  }
  if (typeof options.materializeIds !== 'function') {
    throw new ClipboardError('INVALID_CONFIG', 'Clipboard materializeIds must be a function.');
  }
  const offset = options.offset ?? { x: 24, y: 24 };
  if (typeof offset !== 'object' || offset === null || !Number.isFinite(offset.x) || !Number.isFinite(offset.y)) {
    throw new ClipboardError('INVALID_CONFIG', 'Clipboard offset must be a finite Point.');
  }
  return Object.freeze({
    transport: Object.freeze({
      readText: options.transport.readText.bind(options.transport),
      writeText: options.transport.writeText.bind(options.transport),
    }),
    codec: Object.freeze({
      encode: options.codec.encode.bind(options.codec),
      decode: options.codec.decode.bind(options.codec),
    }),
    materializeIds: options.materializeIds,
    offset: Object.freeze({ x: offset.x, y: offset.y }),
  });
}
