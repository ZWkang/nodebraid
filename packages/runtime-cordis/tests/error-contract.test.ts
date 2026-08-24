import { expect, test } from 'bun:test';

import { NodeBraidError } from '@nodebraid/diagnostics';

import { PluginHostError, createPluginHost } from '../src';

test('Plugin Host structural failures expose the shared NodeBraid error identity', async () => {
  const host = createPluginHost();
  let error: unknown;
  try {
    host.install({} as never);
  } catch (reason) {
    error = reason;
  }

  expect(error).toBeInstanceOf(PluginHostError);
  expect(error).toBeInstanceOf(NodeBraidError);
  expect(error).toMatchObject({
    name: 'PluginHostError',
    domain: 'runtime.plugin-host',
    code: 'INVALID_DEFINITION',
    details: {},
  });
  await host.dispose();
});
