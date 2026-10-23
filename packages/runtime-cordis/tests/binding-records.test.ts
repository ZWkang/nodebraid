import { expect, test } from 'bun:test';

import { definePlugin, defineService, type PluginDefinition } from '../src';

for (const field of ['requires', 'provides'] as const) {
  test(`rejects a listed ${field} Binding without an own descriptor`, () => {
    let valueReads = 0;
    const bindings = new Proxy(
      {},
      {
        ownKeys: () => ['missing'],
        getOwnPropertyDescriptor: () => undefined,
        get() {
          valueReads++;
          throw new Error('an absent Binding value must not be read');
        },
      },
    );

    expect(() => definePlugin({ [field]: bindings, setup() {} } as PluginDefinition)).toThrow(
      expect.objectContaining({ domain: 'runtime.plugin-host', code: 'INVALID_DEFINITION' }),
    );
    expect(valueReads).toBe(0);
  });

  test(`rejects a ${field} Binding removed by an earlier Binding getter`, () => {
    const token = defineService<object>('catalog');
    const bindings: Record<string, typeof token> = {};
    Object.defineProperties(bindings, {
      first: {
        enumerable: true,
        get() {
          delete bindings.second;
          return token;
        },
      },
      second: { enumerable: true, configurable: true, value: token },
    });

    expect(() => definePlugin({ [field]: bindings, setup() {} } as PluginDefinition)).toThrow(
      expect.objectContaining({ domain: 'runtime.plugin-host', code: 'INVALID_DEFINITION' }),
    );
  });

  for (const trap of ['getPrototypeOf', 'ownKeys', 'getOwnPropertyDescriptor', 'get'] as const) {
    test(`preserves the original ${field} Binding ${trap} failure`, () => {
      const failure = new Error('caller reflection failed');
      const catalog = defineService<object>('catalog');
      const bindings = new Proxy(
        { catalog },
        {
          [trap]() {
            throw failure;
          },
        },
      );

      let received: unknown;
      try {
        definePlugin({ [field]: bindings, setup() {} } as PluginDefinition);
      } catch (error) {
        received = error;
      }
      expect(received).toBe(failure);
    });
  }
}

test('retains valid null-prototype accessor Bindings through the public Plugin definition', () => {
  const catalog = defineService<object>('catalog');
  let reads = 0;
  const bindings = Object.create(null) as { catalog: typeof catalog };
  Object.defineProperty(bindings, 'catalog', {
    enumerable: true,
    get() {
      reads++;
      return catalog;
    },
  });
  const consumer = definePlugin({ requires: new Proxy(bindings, {}), setup() {} });
  const provider = definePlugin({
    provides: new Proxy(bindings, {}),
    setup() {
      return { catalog: {} };
    },
  });

  expect(consumer.requires.catalog).toBe(catalog);
  expect(provider.provides.catalog).toBe(catalog);
  expect(reads).toBe(2);
});
