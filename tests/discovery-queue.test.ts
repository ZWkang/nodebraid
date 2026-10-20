import { expect, test } from 'bun:test';
import { syncDiscovery, completeDiscovery, discoveryFrontier, planFrontier } from '../scripts/discovery-queue';

test('unexamined seams remain actionable without another main commit', () => {
  const head = 'a'.repeat(40);
  const initial = syncDiscovery(undefined, head, ['kernel', 'runtime', 'renderer'], []);
  const partial = completeDiscovery(initial, { seam: 'kernel', head, evidence: 'Kernel public contract run passed' });
  const resumed = syncDiscovery(JSON.parse(JSON.stringify(partial)), head, ['kernel', 'runtime', 'renderer'], []);
  expect(discoveryFrontier(resumed)).toEqual(['runtime', 'renderer']);
  expect(() => completeDiscovery(resumed, { seam: 'runtime', head: 'b'.repeat(40), evidence: 'stale' })).toThrow(
    'head',
  );
  expect(discoveryFrontier(resumed)).toEqual(['runtime', 'renderer']);
});

test('new changes invalidate only affected completed seams and preserve pending work', () => {
  const first = syncDiscovery(undefined, 'a'.repeat(40), ['kernel', 'renderer'], []);
  const done = completeDiscovery(first, { seam: 'kernel', head: first.head, evidence: 'public tests passed' });
  expect(discoveryFrontier(syncDiscovery(done, 'b'.repeat(40), ['kernel', 'renderer'], ['kernel']))).toEqual([
    'kernel',
    'renderer',
  ]);
});

test('task dependencies survive restart and cannot skip their acceptance frontier', () => {
  const plan = [
    { id: 'contract', blockedBy: [], acceptance: 'public regression is red then green' },
    { id: 'integration', blockedBy: ['contract'], acceptance: 'full check passes' },
  ];
  expect(planFrontier(plan, [])).toEqual(['contract']);
  expect(planFrontier(JSON.parse(JSON.stringify(plan)), ['contract'])).toEqual(['integration']);
  expect(() => planFrontier(plan, ['integration'])).toThrow('blocker');
  expect(() => planFrontier([{ ...plan[0]!, blockedBy: ['integration'] }, plan[1]!], [])).toThrow('cycle');
});

test('a partial investigation keeps its named remaining interfaces pending', () => {
  const head = 'a'.repeat(40);
  const initial = syncDiscovery(undefined, head, ['kernel'], []);
  const partial = completeDiscovery(initial, {
    seam: 'kernel',
    head,
    evidence: 'node query checked',
    remaining: ['kernel/transactions'],
  });
  expect(discoveryFrontier(syncDiscovery(partial, head, ['kernel'], []))).toEqual(['kernel/transactions']);
});

test('malformed completed coverage cannot erase the pending frontier', () => {
  expect(() =>
    syncDiscovery(
      { head: 'a'.repeat(40), seams: [{ name: 'kernel', pending: false, checkedHead: null, evidence: null }] },
      'a'.repeat(40),
      ['kernel'],
      [],
    ),
  ).toThrow('Malformed');
});
