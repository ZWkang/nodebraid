import { test } from 'bun:test';

import type { Plugin } from '@cflow/runtime-cordis';

import { interactionPlugin } from '../src';

test('publishes Interaction as a Runtime Plugin without a state Service', () => {
  const plugin: Plugin = interactionPlugin;
  void plugin;
});
