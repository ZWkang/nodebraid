import { expect, test } from 'bun:test';
import type { DiagnosticEvent } from '@nodebraid/diagnostics';

import { createPluginHost, definePlugin, runtimeDiagnosticEvents } from '../src';

test('terminal cleanup retains resource and diagnostic inspection failures together', async () => {
  const original = new AggregateError([new Error('resource failed')], 'application cleanup');
  const inspectionFailure = new Error('errors getter failed');
  let reads = 0;
  Object.defineProperty(original, 'errors', {
    get() {
      reads += 1;
      throw inspectionFailure;
    },
  });
  const events: DiagnosticEvent[] = [];
  const cleanup: string[] = [];
  const host = createPluginHost({
    diagnostics: {
      sink: (event) => {
        events.push(event);
      },
    },
  });
  const installation = host.install(
    definePlugin({
      setup(context) {
        context.own(() => {
          cleanup.push('early');
        });
        context.own(() => {
          cleanup.push('failing');
          throw original;
        });
        context.own(() => {
          cleanup.push('late');
        });
      },
    }),
  );
  try {
    await installation.whenActive();
    const disposal = installation.dispose();
    expect(installation.dispose()).toBe(disposal);
    const failure = await rejectedDisposal(disposal);
    expect(containsReference(failure, original)).toBe(true);
    expect(containsReference(failure, inspectionFailure)).toBe(true);
    expect(cleanup).toEqual(['late', 'failing', 'early']);
    expect(installation.getSnapshot()).toEqual({ status: 'disposed' });
    expect(reads).toBe(1);
    const failures = events.filter((event) => event.name === runtimeDiagnosticEvents.installationDisposeFailed);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.error).toBe(failure);
  } finally {
    await host.dispose();
  }
});

test('disabled ordinary diagnostics does not inspect cleanup error members', async () => {
  const original = new AggregateError([new Error('resource failed')], 'application cleanup');
  const inspectionFailure = new Error('disabled diagnostic getter');
  let reads = 0;
  Object.defineProperty(original, 'errors', {
    get() {
      reads += 1;
      throw inspectionFailure;
    },
  });
  const host = createPluginHost();
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
    const failure = await rejectedDisposal(installation.dispose());
    expect(reads).toBe(0);
    expect(containsReference(failure, original)).toBe(true);
    expect(containsReference(failure, inspectionFailure)).toBe(false);
  } finally {
    await host.dispose();
  }
});

type InspectionSite = 'errors' | 'length' | 'membership' | 'member' | 'message';
const inspectionSites: readonly InspectionSite[] = ['errors', 'length', 'membership', 'member', 'message'];
const inspectionFailures: readonly unknown[] = [
  undefined,
  null,
  false,
  0,
  '',
  Symbol('inspection'),
  new Error('inspection'),
];

for (const route of ['installation', 'host'] as const) {
  for (const withSink of [false, true]) {
    for (const site of inspectionSites) {
      for (const [failureIndex, inspectionFailure] of inspectionFailures.entries()) {
        test(`retains ${site} read failure ${failureIndex} through ${route} disposal (Sink ${withSink})`, async () => {
          const diagnosed = new Error('already diagnosed');
          const leaf = new Error('new cleanup failure');
          const original = new AggregateError(site === 'message' ? [diagnosed, leaf] : [leaf], 'application cleanup');
          let reads = 0;
          const fail = (): never => {
            reads += 1;
            throw inspectionFailure;
          };
          if (site === 'errors') Object.defineProperty(original, 'errors', { get: fail });
          else if (site === 'message') Object.defineProperty(original, 'message', { get: fail });
          else
            original.errors = new Proxy([leaf], {
              get(target, key, receiver) {
                if ((site === 'length' && key === 'length') || (site === 'member' && key === '0')) fail();
                return Reflect.get(target, key, receiver);
              },
              has(target, key) {
                if (site === 'membership' && key === '0') fail();
                return Reflect.has(target, key);
              },
            });
          const events: DiagnosticEvent[] = [];
          const cleanup: string[] = [];
          const host = createPluginHost({
            diagnostics: withSink
              ? {
                  sink: (event) => {
                    events.push(event);
                  },
                }
              : {},
          });
          const installation = host.install(
            definePlugin({
              setup(context) {
                if (site === 'message')
                  context.diagnostics.emit({ name: 'probe.already-diagnosed', level: 'error', error: diagnosed });
                context.own(() => {
                  cleanup.push('first');
                });
                context.own(() => {
                  cleanup.push('failure');
                  throw original;
                });
                context.own(() => {
                  cleanup.push('last');
                });
              },
            }),
          );
          let failure: unknown;
          try {
            await installation.whenActive();
            const disposal = route === 'host' ? host.dispose() : installation.dispose();
            expect(route === 'host' ? host.dispose() : installation.dispose()).toBe(disposal);
            failure = await rejectedDisposal(disposal);
            expect(containsReference(failure, original)).toBe(true);
            expect(cleanup).toEqual(['last', 'failure', 'first']);
            expect(installation.getSnapshot()).toEqual({ status: 'disposed' });
            expect(reads).toBe(withSink ? 1 : 0);
            if (withSink) {
              const reported = events.filter(
                (event) => event.name === runtimeDiagnosticEvents.installationDisposeFailed,
              );
              expect(reported).toHaveLength(1);
              const combined = reported[0]?.error;
              expect(combined instanceof AggregateError).toBe(true);
              const members: unknown[] = (combined as AggregateError).errors;
              expect(members).toHaveLength(2);
              expect(containsReference(members[0], original)).toBe(true);
              expect(Object.is(members[1], inspectionFailure)).toBe(true);
              expect(containsReference(failure, combined)).toBe(true);
            } else expect(events).toEqual([]);
            const repeated = await rejectedDisposal(route === 'host' ? host.dispose() : installation.dispose());
            expect(repeated).toBe(failure);
          } finally {
            if (route === 'host')
              await host.dispose().catch((error) => {
                expect(Object.is(error, failure)).toBe(true);
              });
            else await host.dispose();
          }
        });
      }
    }
  }
}

test.each([false, true])(
  'malformed members retain cleanup and explicit validation failures (Sink %p)',
  async (withSink) => {
    const original = new AggregateError([], 'application cleanup');
    Object.defineProperty(original, 'errors', { value: {} });
    const events: DiagnosticEvent[] = [];
    const host = createPluginHost({
      diagnostics: withSink
        ? {
            sink: (event) => {
              events.push(event);
            },
          }
        : {},
    });
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
      const failure = await rejectedDisposal(installation.dispose());
      expect(containsReference(failure, original)).toBe(true);
      if (withSink) {
        const reported = events.find(
          (event) => event.name === runtimeDiagnosticEvents.installationDisposeFailed,
        )?.error;
        expect(reported instanceof AggregateError).toBe(true);
        const members: unknown[] = (reported as AggregateError).errors;
        expect(members).toHaveLength(2);
        expect(members[1] instanceof TypeError).toBe(true);
        expect(containsReference(failure, reported)).toBe(true);
      } else expect(events).toEqual([]);
    } finally {
      await host.dispose();
    }
  },
);

test('parent cleanup does not reinspect an already diagnosed child inspection failure', async () => {
  const original = new AggregateError([new Error('child resource')], 'child cleanup');
  const inspectionFailure = new Error('child errors getter');
  const parentFailure = new Error('parent resource');
  let reads = 0;
  Object.defineProperty(original, 'errors', {
    get() {
      reads += 1;
      throw inspectionFailure;
    },
  });
  const events: DiagnosticEvent[] = [];
  const cleanup: string[] = [];
  const host = createPluginHost({
    diagnostics: {
      sink: (event) => {
        events.push(event);
      },
    },
  });
  const child = definePlugin({
    name: 'inspection-child',
    setup(context) {
      context.own(() => {
        cleanup.push('child');
        throw original;
      });
    },
  });
  const parent = host.install(
    definePlugin({
      name: 'inspection-parent',
      async setup(context) {
        const installation = context.install(child);
        context.own(() => {
          cleanup.push('parent');
          throw parentFailure;
        });
        await installation.whenActive();
      },
    }),
  );
  try {
    await parent.whenActive();
    const failure = await rejectedDisposal(parent.dispose());
    expect(containsReference(failure, original)).toBe(true);
    expect(containsReference(failure, inspectionFailure)).toBe(true);
    expect(containsReference(failure, parentFailure)).toBe(true);
    expect(cleanup).toEqual(['parent', 'child']);
    expect(reads).toBe(1);
    const failures = events.filter((event) => event.name === runtimeDiagnosticEvents.installationDisposeFailed);
    expect(failures).toHaveLength(2);
    const childEvent = failures.find((event) => event.scope.pluginName === 'inspection-child');
    const parentEvent = failures.find((event) => event.scope.pluginName === 'inspection-parent');
    expect(containsReference(childEvent?.error, original)).toBe(true);
    expect(containsReference(childEvent?.error, inspectionFailure)).toBe(true);
    expect(containsReference(parentEvent?.error, parentFailure)).toBe(true);
    expect(containsReference(parentEvent?.error, original)).toBe(false);
    expect(containsReference(parentEvent?.error, inspectionFailure)).toBe(false);
  } finally {
    await host.dispose();
  }
});

async function rejectedDisposal(disposal: Promise<void>): Promise<unknown> {
  let rejected = false;
  let failure: unknown;
  try {
    await disposal;
  } catch (error) {
    rejected = true;
    failure = error;
  }
  expect(rejected).toBe(true);
  return failure;
}

function containsReference(error: unknown, expected: unknown, seen = new Set<unknown>()): boolean {
  if (Object.is(error, expected)) return true;
  if (typeof error !== 'object' || error === null || seen.has(error)) return false;
  seen.add(error);
  const members = Object.getOwnPropertyDescriptor(error, 'errors');
  if (!members || !('value' in members) || !Array.isArray(members.value)) return false;
  return members.value.some((member: unknown) => containsReference(member, expected, seen));
}
