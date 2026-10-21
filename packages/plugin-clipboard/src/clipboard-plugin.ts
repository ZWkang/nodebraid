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
  const transport = options.transport;
  if (typeof transport !== 'object' || transport === null) {
    throw new ClipboardError('INVALID_CONFIG', 'Clipboard transport is malformed.');
  }
  const readText = transport.readText;
  if (typeof readText !== 'function') {
    throw new ClipboardError('INVALID_CONFIG', 'Clipboard transport is malformed.');
  }
  const writeText = transport.writeText;
  if (typeof writeText !== 'function') {
    throw new ClipboardError('INVALID_CONFIG', 'Clipboard transport is malformed.');
  }
  const codec = options.codec;
  if (typeof codec !== 'object' || codec === null) {
    throw new ClipboardError('INVALID_CONFIG', 'Clipboard codec is malformed.');
  }
  const encode = codec.encode;
  if (typeof encode !== 'function') {
    throw new ClipboardError('INVALID_CONFIG', 'Clipboard codec is malformed.');
  }
  const decode = codec.decode;
  if (typeof decode !== 'function') {
    throw new ClipboardError('INVALID_CONFIG', 'Clipboard codec is malformed.');
  }
  const materializeIds = options.materializeIds;
  if (typeof materializeIds !== 'function') {
    throw new ClipboardError('INVALID_CONFIG', 'Clipboard materializeIds must be a function.');
  }
  const offset = options.offset ?? { x: 24, y: 24 };
  if (typeof offset !== 'object' || offset === null) {
    throw new ClipboardError('INVALID_CONFIG', 'Clipboard offset must be a finite Point.');
  }
  const x = offset.x;
  if (!Number.isFinite(x)) {
    throw new ClipboardError('INVALID_CONFIG', 'Clipboard offset must be a finite Point.');
  }
  const y = offset.y;
  if (!Number.isFinite(y)) {
    throw new ClipboardError('INVALID_CONFIG', 'Clipboard offset must be a finite Point.');
  }
  return Object.freeze({
    transport: Object.freeze({
      readText: readText.bind(transport),
      writeText: writeText.bind(transport),
    }),
    codec: Object.freeze({
      encode: encode.bind(codec),
      decode: decode.bind(codec),
    }),
    materializeIds,
    offset: Object.freeze({ x, y }),
  });
}
