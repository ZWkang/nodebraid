import { expect, test } from 'bun:test';
import { createCanvasKernel, nodeId } from '@nodebraid/kernel';
import { createPluginHost, definePlugin } from '@nodebraid/runtime-cordis';

import { portPlugin, portService, type PortContribution, type PortService } from '../src';

async function createPortHarness() {
  const host = createPluginHost();
  host.install(portPlugin);
  let ports!: PortService;
  const consumer = host.install(
    definePlugin({
      requires: { ports: portService },
      setup(context) {
        ports = context.services.ports;
      },
    }),
  );
  await consumer.whenActive();
  const kernel = createCanvasKernel();
  kernel.transact((transaction) => {
    transaction.nodes.add({ id: nodeId('node'), type: 'task', position: { x: 0, y: 0 }, data: null });
  });
  return { host, ports, kernel };
}

test('Port Snapshots retain the definition values that passed validation', async () => {
  const { host, ports, kernel } = await createPortHarness();
  let idReads = 0;
  let roleReads = 0;
  const definition = {
    get id() {
      idReads += 1;
      return idReads <= 2 ? 'out' : 42;
    },
    get role() {
      roleReads += 1;
      return roleReads === 1 ? 'source' : 'invalid-role';
    },
  };
  try {
    ports.register({ id: 'task-ports', definePorts: () => [definition as { id: string; role: 'source' }] });

    const snapshot = ports.snapshot(kernel.read().snapshot);

    expect(snapshot.nodes[0]?.ports).toEqual([{ id: 'out', role: 'source' }]);
    expect(Object.isFrozen(snapshot.nodes[0]?.ports[0])).toBe(true);
    expect(idReads).toBe(1);
    expect(roleReads).toBe(1);
  } finally {
    await host.dispose();
  }
});

test('Port registration retains the identity and callback that passed validation', async () => {
  const { host, ports, kernel } = await createPortHarness();
  let idReads = 0;
  let callbackReads = 0;
  const definePorts = () => [{ id: 'out', role: 'source' as const }];
  const contribution = {
    get id() {
      idReads += 1;
      return idReads <= 2 ? 'task-ports' : 42;
    },
    get definePorts() {
      callbackReads += 1;
      return callbackReads === 1 ? definePorts : null;
    },
  } as PortContribution;
  try {
    const registration = ports.register(contribution);

    expect(ports.snapshot(kernel.read().snapshot).nodes[0]?.ports).toEqual([{ id: 'out', role: 'source' }]);
    expect(() => ports.register({ id: 'task-ports', definePorts: () => [] })).toThrow(
      expect.objectContaining({ code: 'CONTRIBUTION_ALREADY_REGISTERED' }),
    );
    registration.dispose();
    expect(ports.snapshot(kernel.read().snapshot).nodes).toEqual([]);
    expect(idReads).toBe(1);
    expect(callbackReads).toBe(1);
  } finally {
    await host.dispose();
  }
});

test('Connection lookup uses the validated Port Definition values', async () => {
  const { host, ports, kernel } = await createPortHarness();
  try {
    ports.register({
      id: 'task-ports',
      definePorts() {
        let idReads = 0;
        let roleReads = 0;
        return [
          {
            get id() {
              return ++idReads <= 2 ? 'out' : 42;
            },
            get role() {
              return ++roleReads === 1 ? 'source' : 'invalid-role';
            },
          },
        ] as { id: string; role: 'source' }[];
      },
    });
    const node = kernel.read().query.getNode(nodeId('node'))!;

    expect(ports.isConnectionTargetDefined(node, { nodeId: node.id, portId: 'out', role: 'source' })).toBe(true);
  } finally {
    await host.dispose();
  }
});

test('a later role value cannot rescue a malformed captured definition', async () => {
  const { host, ports, kernel } = await createPortHarness();
  let roleReads = 0;
  try {
    ports.register({
      id: 'task-ports',
      definePorts: () =>
        [
          {
            id: 'out',
            get role() {
              return ++roleReads === 1 ? 'invalid-role' : 'target';
            },
          },
        ] as { id: string; role: 'target' }[],
    });

    expect(() => ports.snapshot(kernel.read().snapshot)).toThrow(
      expect.objectContaining({ domain: 'plugin.port', code: 'INVALID_PORT_DEFINITION' }),
    );
    expect(roleReads).toBe(1);
  } finally {
    await host.dispose();
  }
});

test('property reads and Contribution callbacks preserve their original failures', async () => {
  const { host, ports, kernel } = await createPortHarness();
  try {
    for (const field of ['id', 'definePorts'] as const) {
      const original = new Error(`Contribution ${field} read failed`);
      const contribution = { id: 'task-ports', definePorts: () => [] };
      Object.defineProperty(contribution, field, {
        get() {
          throw original;
        },
      });
      let failure: unknown;
      try {
        ports.register(contribution);
      } catch (error) {
        failure = error;
      }
      expect(failure).toBe(original);
    }
    for (const field of ['id', 'role', 'callback'] as const) {
      const original = new Error(`Definition ${field} failed`);
      const definition = { id: 'out', role: 'source' as const };
      if (field !== 'callback')
        Object.defineProperty(definition, field, {
          get() {
            throw original;
          },
        });
      const registration = ports.register({
        id: 'task-ports',
        definePorts() {
          if (field === 'callback') throw original;
          return [definition];
        },
      });
      let failure: unknown;
      try {
        ports.snapshot(kernel.read().snapshot);
      } catch (error) {
        failure = error;
      }
      expect(failure).toBe(original);
      registration.dispose();
    }
  } finally {
    await host.dispose();
  }
});

test('malformed captured values and unknown own fields retain their Port error codes', async () => {
  const { host, ports, kernel } = await createPortHarness();
  try {
    for (const value of [
      null,
      { id: '', definePorts: () => [] },
      { id: 'task-ports', definePorts: null },
      { id: 'task-ports', definePorts: () => [], extra: true },
    ]) {
      expect(() => ports.register(value as unknown as PortContribution)).toThrow(
        expect.objectContaining({ domain: 'plugin.port', code: 'INVALID_CONTRIBUTION' }),
      );
    }
    for (const value of [
      null,
      { id: '', role: 'source' },
      { id: 'out', role: 'invalid' },
      { id: 'out', role: 'source', extra: true },
    ]) {
      const registration = ports.register({
        id: 'task-ports',
        definePorts: () => [value] as { id: string; role: 'source' }[],
      });
      expect(() => ports.snapshot(kernel.read().snapshot)).toThrow(
        expect.objectContaining({ domain: 'plugin.port', code: 'INVALID_PORT_DEFINITION' }),
      );
      registration.dispose();
    }
  } finally {
    await host.dispose();
  }
});

test('invalid Port IDs fail before later properties are read', async () => {
  const { host, ports, kernel } = await createPortHarness();
  let laterReads = 0;
  const laterFailure = new Error('later property must not be read');
  try {
    expect(() =>
      ports.register({
        id: '',
        get definePorts(): never {
          laterReads += 1;
          throw laterFailure;
        },
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_CONTRIBUTION' }));
    ports.register({
      id: 'task-ports',
      definePorts: () => [
        {
          id: '',
          get role(): never {
            laterReads += 1;
            throw laterFailure;
          },
        },
      ],
    });
    expect(() => ports.snapshot(kernel.read().snapshot)).toThrow(
      expect.objectContaining({ code: 'INVALID_PORT_DEFINITION' }),
    );
    expect(laterReads).toBe(0);
  } finally {
    await host.dispose();
  }
});
