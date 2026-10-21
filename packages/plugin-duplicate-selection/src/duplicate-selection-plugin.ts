import { commandService } from '@nodebraid/plugin-command';
import { kernelService } from '@nodebraid/plugin-kernel';
import { sessionService } from '@nodebraid/plugin-session';
import { definePlugin } from '@nodebraid/runtime-cordis';

import type { CreateDuplicateSelectionPluginOptions } from './contracts';
import { createDuplicateSelectionHandler, duplicateSelectionCommand } from './duplicate-selection-command';
import { DuplicateSelectionError } from './duplicate-selection-error';

export function createDuplicateSelectionPlugin(options: CreateDuplicateSelectionPluginOptions) {
  const accepted = acceptOptions(options);
  return definePlugin({
    name: '@nodebraid/plugin-duplicate-selection',
    requires: { commands: commandService, kernel: kernelService, session: sessionService },
    setup(context) {
      const registration = context.services.commands.register(
        duplicateSelectionCommand,
        createDuplicateSelectionHandler(context.services.kernel, context.services.session, accepted),
      );
      context.own(() => registration.dispose());
    },
  });
}

function acceptOptions(
  options: CreateDuplicateSelectionPluginOptions,
): Readonly<Required<CreateDuplicateSelectionPluginOptions>> {
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new DuplicateSelectionError('INVALID_CONFIG', 'Duplicate Selection options must be an object.');
  }
  for (const key of Reflect.ownKeys(options)) {
    if (key !== 'materializeIds' && key !== 'offset') {
      throw new DuplicateSelectionError('INVALID_CONFIG', 'Duplicate Selection options contain an unknown field.');
    }
  }
  const materializeIds = options.materializeIds;
  if (typeof materializeIds !== 'function') {
    throw new DuplicateSelectionError('INVALID_CONFIG', 'Duplicate Selection materializeIds must be a function.');
  }
  const configuredOffset = options.offset;
  const offset = configuredOffset === undefined ? { x: 24, y: 24 } : configuredOffset;
  if (typeof offset !== 'object' || offset === null || Array.isArray(offset)) {
    throw new DuplicateSelectionError('INVALID_CONFIG', 'Duplicate Selection offset must be a Point.');
  }
  const x = offset.x;
  if (!Number.isFinite(x)) {
    throw new DuplicateSelectionError('INVALID_CONFIG', 'Duplicate Selection offset must be finite.');
  }
  const y = offset.y;
  if (!Number.isFinite(y)) {
    throw new DuplicateSelectionError('INVALID_CONFIG', 'Duplicate Selection offset must be finite.');
  }
  return Object.freeze({
    materializeIds,
    offset: Object.freeze({ x, y }),
  });
}
