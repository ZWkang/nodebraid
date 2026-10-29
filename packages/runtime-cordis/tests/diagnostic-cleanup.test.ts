import { expect, test } from 'bun:test';
import type { DiagnosticEvent } from '@nodebraid/diagnostics';
import { createPluginHost, definePlugin, runtimeDiagnosticEvents } from '../src';

test.each(['map', 'forEach', 'constructor', Symbol.iterator])(
  'terminal cleanup diagnostics do not invoke a supplied %s hook',
  async (key) => {
    const original = new AggregateError([new Error('owned resource failed')], 'original cleanup');
    const hookFailure = new Error('collection hook failed');
    let hookReads = 0;
    Object.defineProperty(original.errors, key, {
      get() {
        hookReads += 1;
        throw hookFailure;
      },
    });
    const events: DiagnosticEvent[] = [];
    let cleanupCalls = 0;
    const host = createPluginHost({ diagnostics: { sink: (event) => events.push(event) } });
    const installation = host.install(
      definePlugin({
        setup(context) {
          context.own(() => {
            cleanupCalls += 1;
            throw original;
          });
        },
      }),
    );
    try {
      await installation.whenActive();
      const disposal = installation.dispose();
      expect(installation.dispose()).toBe(disposal);
      const failure = await disposal.catch((error: unknown) => error);
      expect(hookReads).toBe(0);
      expect(failure).toBeInstanceOf(AggregateError);
      expect(containsError(failure, original)).toBe(true);
      expect(cleanupCalls).toBe(1);
      expect(installation.getSnapshot()).toEqual({ status: 'disposed' });
      const failures = events.filter((event) => event.name === runtimeDiagnosticEvents.installationDisposeFailed);
      expect(failures).toHaveLength(1);
      expect(failures[0]?.error).toBe(failure);
      expect(Object.isFrozen(original.errors)).toBe(false);
    } finally {
      await host.dispose();
    }
  },
);

test('cleanup diagnostics preserve sparse inherited members, native Proxy length and the raw failure', async () => {
  const leaf = new Error('inherited cleanup failure');
  const original = new AggregateError([], 'sparse cleanup');
  const members: unknown[] = new Array(3);
  Object.setPrototypeOf(members, Object.create(Array.prototype, { 1: { value: leaf } }));
  members[2] = undefined;
  original.errors = new Proxy(members, {
    get(target, key, receiver) {
      return key === 'length' ? '3.9' : Reflect.get(target, key, receiver);
    },
  });
  const events: DiagnosticEvent[] = [];
  const host = createPluginHost({ diagnostics: { sink: (event) => events.push(event) } });
  const installation = host.install(
    definePlugin({
      setup(context) {
        context.own(() => {
          throw original;
        });
      },
    }),
  );
  try {
    await installation.whenActive();
    const failure = await installation.dispose().catch((error: unknown) => error);
    expect(containsError(failure, original)).toBe(true);
    const failures = events.filter((event) => event.name === runtimeDiagnosticEvents.installationDisposeFailed);
    expect(failures).toHaveLength(1);
    expect(containsError(failures[0]?.error, leaf)).toBe(true);
    expect(containsError(failures[0]?.error, undefined)).toBe(true);
    expect(Object.hasOwn(members, 0)).toBe(false);
    expect(Object.hasOwn(members, 1)).toBe(false);
    expect(Object.isFrozen(members)).toBe(false);
    expect(original.errors[1]).toBe(leaf);
  } finally {
    await host.dispose();
  }
});

test('terminal cleanup preserves a circular AggregateError without passing it through Cordis traversal', async () => {
  const original = new AggregateError([], 'circular cleanup');
  original.errors.push(original);
  const events: DiagnosticEvent[] = [];
  const host = createPluginHost({ diagnostics: { sink: (event) => events.push(event) } });
  const installation = host.install(
    definePlugin({
      setup(context) {
        context.own(() => {
          throw original;
        });
      },
    }),
  );
  try {
    await installation.whenActive();
    const failure = await installation.dispose().catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(AggregateError);
    expect(containsError(failure, original)).toBe(true);
    expect(installation.getSnapshot()).toEqual({ status: 'disposed' });
    const failures = events.filter((event) => event.name === runtimeDiagnosticEvents.installationDisposeFailed);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.error).toBe(failure);
    expect(original.errors[0]).toBe(original);
  } finally {
    await host.dispose();
  }
});

test.each(['resolve', 'reject'] as const)(
  'terminal cleanup preserves failures when aborted setup will %s',
  async (settlement) => {
    const original = new AggregateError([new Error('early owned resource failed')], 'early cleanup');
    let hookReads = 0;
    let cleanupCalls = 0;
    Object.defineProperty(original.errors, 'forEach', {
      get() {
        hookReads += 1;
        throw new Error('Cordis collection hook');
      },
    });
    let started!: () => void;
    const setupStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const events: DiagnosticEvent[] = [];
    const host = createPluginHost({ diagnostics: { sink: (event) => events.push(event) } });
    const installation = host.install(
      definePlugin({
        async setup(context) {
          context.own(() => {
            cleanupCalls += 1;
            throw original;
          });
          await new Promise<void>((resolve, reject) => {
            context.signal.addEventListener(
              'abort',
              () => (settlement === 'resolve' ? resolve() : reject(context.signal.reason)),
              { once: true },
            );
            started();
          });
        },
      }),
    );
    try {
      await setupStarted;
      const disposal = installation.dispose();
      expect(installation.dispose()).toBe(disposal);
      const failure = await disposal.catch((error: unknown) => error);
      expect(hookReads).toBe(0);
      expect(failure).toBeInstanceOf(AggregateError);
      expect(containsError(failure, original)).toBe(true);
      expect(cleanupCalls).toBe(1);
      expect(installation.getSnapshot()).toEqual({ status: 'disposed' });
      const failures = events.filter((event) => event.name === runtimeDiagnosticEvents.installationDisposeFailed);
      expect(failures).toHaveLength(1);
      expect(failures[0]?.error).toBe(failure);
    } finally {
      await host.dispose();
    }
  },
);

test('terminal cleanup diagnostics retain an unchanged AggregateError containing NaN', async () => {
  const original = new AggregateError([Number.NaN], 'original cleanup');
  const events: DiagnosticEvent[] = [];
  const host = createPluginHost({ diagnostics: { sink: (event) => events.push(event) } });
  const installation = host.install(
    definePlugin({
      setup(context) {
        context.own(() => {
          throw original;
        });
      },
    }),
  );
  try {
    await installation.whenActive();
    const disposal = installation.dispose();
    let rejected = false;
    let failure: unknown;
    await disposal.catch((error: unknown) => {
      rejected = true;
      failure = error;
    });
    expect(rejected).toBe(true);
    expect(containsError(failure, original)).toBe(true);
    const failures = events.filter((event) => event.name === runtimeDiagnosticEvents.installationDisposeFailed);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.error).toBe(failure);
    expect(containsError(failures[0]?.error, original)).toBe(true);
    expect(original.errors[0]).toBeNaN();
    expect(Object.isFrozen(original.errors)).toBe(false);
    expect(installation.getSnapshot()).toEqual({ status: 'disposed' });
  } finally {
    await host.dispose();
  }
});

test('Host cleanup diagnostics retain unchanged NaN, signed zero and ordinary members', async () => {
  const leaf = new Error('ordinary member');
  const original = new AggregateError([Number.NaN, -0, Infinity, -Infinity, undefined, leaf], 'mixed cleanup');
  const members = original.errors;
  const events: DiagnosticEvent[] = [];
  const cleanup: string[] = [];
  const host = createPluginHost({ diagnostics: { sink: (event) => events.push(event) } });
  const installation = host.install(
    definePlugin({
      setup(context) {
        context.own(() => {
          cleanup.push('early');
        });
        context.own(() => {
          cleanup.push('failure');
          throw original;
        });
        context.own(() => {
          cleanup.push('late');
        });
      },
    }),
  );
  let failure: unknown;
  try {
    await installation.whenActive();
    const disposal = host.dispose();
    expect(host.dispose()).toBe(disposal);
    let rejected = false;
    await disposal.catch((error: unknown) => {
      rejected = true;
      failure = error;
    });
    expect(rejected).toBe(true);
    const installationFailure = await installation.dispose().catch((error: unknown) => error);
    const failures = events.filter((event) => event.name === runtimeDiagnosticEvents.installationDisposeFailed);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.error).toBe(installationFailure);
    expect(containsError(failures[0]?.error, original)).toBe(true);
    expect(containsError(failure, original)).toBe(true);
    expect(await host.dispose().catch((error: unknown) => error)).toBe(failure);
    expect(cleanup).toEqual(['late', 'failure', 'early']);
    expect(installation.getSnapshot()).toEqual({ status: 'disposed' });
    expect(original.errors).toBe(members);
    expect(original.errors[0]).toBeNaN();
    expect(original.errors[1]).toBe(-0);
    expect(original.errors[2]).toBe(Infinity);
    expect(original.errors[3]).toBe(-Infinity);
    expect(original.errors[4]).toBeUndefined();
    expect(original.errors[5]).toBe(leaf);
    expect(Object.isFrozen(members)).toBe(false);
  } finally {
    await host.dispose().catch((error: unknown) => {
      expect(error).toBe(failure);
    });
  }
});

test('cleanup diagnostic filtering retains an unchanged NaN aggregate beside an already diagnosed error', async () => {
  const diagnosed = new Error('already diagnosed');
  const retained = new AggregateError([Number.NaN, -0], 'retained cleanup stage');
  const original = new AggregateError([diagnosed, retained], 'application cleanup');
  const events: DiagnosticEvent[] = [];
  const host = createPluginHost({ diagnostics: { sink: (event) => events.push(event) } });
  const installation = host.install(
    definePlugin({
      setup(context) {
        context.diagnostics.emit({ name: 'test.already-diagnosed', level: 'error', error: diagnosed });
        context.own(() => {
          throw original;
        });
      },
    }),
  );
  try {
    await installation.whenActive();
    let rejected = false;
    let failure: unknown;
    await installation.dispose().catch((error: unknown) => {
      rejected = true;
      failure = error;
    });
    expect(rejected).toBe(true);
    expect(containsError(failure, original)).toBe(true);
    expect(containsError(failure, diagnosed)).toBe(true);
    expect(containsError(failure, retained)).toBe(true);
    const failures = events.filter((event) => event.name === runtimeDiagnosticEvents.installationDisposeFailed);
    expect(failures).toHaveLength(1);
    expect(containsError(failures[0]?.error, diagnosed)).toBe(false);
    expect(containsError(failures[0]?.error, original)).toBe(false);
    expect(containsError(failures[0]?.error, retained)).toBe(true);
    expect(original.errors).toEqual([diagnosed, retained]);
    expect(retained.errors[0]).toBeNaN();
    expect(retained.errors[1]).toBe(-0);
  } finally {
    await host.dispose();
  }
});

function containsError(error: unknown, expected: unknown): boolean {
  if (error === expected) return true;
  return error instanceof AggregateError && error.errors.some((nested: unknown) => containsError(nested, expected));
}
