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

function containsError(error: unknown, expected: unknown): boolean {
  if (error === expected) return true;
  return error instanceof AggregateError && error.errors.some((nested: unknown) => containsError(nested, expected));
}
