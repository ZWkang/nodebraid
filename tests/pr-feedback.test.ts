import { expect, test } from 'bun:test';
import {
  currentDecisions,
  incomingFeedback,
  evaluateFeedback,
  validateReceipt,
  type FeedbackSnapshot,
} from '../scripts/pr-feedback';

const snapshot: FeedbackSnapshot = {
  number: 42,
  title: '[agent] Fix selection',
  state: 'OPEN',
  isDraft: false,
  headRefName: 'feat/issue-7',
  headRefOid: 'a'.repeat(40),
  headRepository: { nameWithOwner: 'ZWkang/nodebraid' },
  baseRefName: 'main',
  mergeable: 'MERGEABLE',
  mergeStateStatus: 'CLEAN',
  reviewDecision: '',
  statusCheckRollup: [
    {
      name: 'checks',
      workflowName: 'Checks',
      status: 'COMPLETED',
      conclusion: 'SUCCESS',
      detailsUrl: 'https://github.com/check/1',
    },
  ],
  feedback: [],
  threads: [],
};

test('local evidence comments do not trigger themselves, while later edits still enter the queue', () => {
  const own = { key: 'comment:1', digest: 'published', body: 'evidence', url: 'https://github.com/comment/1' };
  const edited = { ...own, digest: 'edited', body: 'human correction' };
  const incoming = { ...own, key: 'comment:2' };
  expect(incomingFeedback([own, edited, incoming], [own])).toEqual([edited, incoming]);
});

test('only a verified current PR head is ready for human review', () => {
  expect(evaluateFeedback({ ...snapshot, title: '[local-agent] Fix selection' }, 'ZWkang/nodebraid', []).status).toBe(
    'ready',
  );
  expect(evaluateFeedback(snapshot, 'ZWkang/nodebraid', []).status).toBe('ready');
  expect(evaluateFeedback({ ...snapshot, statusCheckRollup: [] }, 'ZWkang/nodebraid', []).status).toBe('waiting-ci');
  expect(
    evaluateFeedback(
      { ...snapshot, mergeStateStatus: 'BLOCKED', reviewDecision: 'REVIEW_REQUIRED' },
      'ZWkang/nodebraid',
      [],
    ).status,
  ).toBe('waiting-review');
  expect(
    evaluateFeedback({ ...snapshot, headRepository: { nameWithOwner: 'attacker/fork' } }, 'ZWkang/nodebraid', [])
      .status,
  ).toBe('excluded');
});

test('the same failed check requests one repair; a rerun or new head requests new work', () => {
  const failed = { ...snapshot, statusCheckRollup: [{ ...snapshot.statusCheckRollup[0], conclusion: 'FAILURE' }] };
  const first = evaluateFeedback(failed, 'ZWkang/nodebraid', []);
  expect(first.status).toBe('repair');
  expect(evaluateFeedback(failed, 'ZWkang/nodebraid', []).request).toBe(first.request);
  expect(evaluateFeedback({ ...failed, headRefOid: 'b'.repeat(40) }, 'ZWkang/nodebraid', []).request).not.toBe(
    first.request,
  );
  expect(
    evaluateFeedback(
      { ...failed, statusCheckRollup: [{ ...failed.statusCheckRollup[0], detailsUrl: 'https://github.com/check/2' }] },
      'ZWkang/nodebraid',
      [],
    ).request,
  ).not.toBe(first.request);
});

test('addressed review feedback is not repeated, but edits and design questions remain actionable', () => {
  const item = { key: 'comment:7', digest: 'old', body: 'wrong result', url: 'https://github.com/comment/7' };
  const current = { ...snapshot, feedback: [item] };
  const decision = {
    key: item.key,
    digest: item.digest,
    outcome: 'addressed' as const,
    reason: 'Regression and fix verified.',
  };
  expect(evaluateFeedback(current, 'ZWkang/nodebraid', [decision]).status).toBe('ready');
  expect(
    evaluateFeedback({ ...current, feedback: [{ ...item, digest: 'edited' }] }, 'ZWkang/nodebraid', [decision]).status,
  ).toBe('repair');
  expect(evaluateFeedback(current, 'ZWkang/nodebraid', [{ ...decision, outcome: 'needs-design' }]).status).toBe(
    'repair',
  );
});

test('green CI does not dismiss a human change request or ignore a conflicting base', () => {
  expect(evaluateFeedback({ ...snapshot, reviewDecision: 'CHANGES_REQUESTED' }, 'ZWkang/nodebraid', []).status).toBe(
    'waiting-review',
  );
  expect(evaluateFeedback({ ...snapshot, mergeable: 'CONFLICTING' }, 'ZWkang/nodebraid', []).status).toBe('repair');
  expect(evaluateFeedback({ ...snapshot, mergeStateStatus: 'BEHIND' }, 'ZWkang/nodebraid', []).status).toBe('repair');
  expect(
    evaluateFeedback(
      { ...snapshot, statusCheckRollup: [{ ...snapshot.statusCheckRollup[0], status: 'IN_PROGRESS', conclusion: '' }] },
      'ZWkang/nodebraid',
      [],
    ).status,
  ).toBe('waiting-ci');
});

test('a handoff cannot omit feedback, invent dispositions, or claim a different request', () => {
  const item = { key: 'comment:7', digest: 'old', body: 'wrong result', url: 'https://github.com/comment/7' };
  const receipt = {
    number: 42,
    run: 'local-run-123',
    request: 'request1',
    base: 'a'.repeat(40),
    commit: 'b'.repeat(40),
    evidence: 'bun run check passed; patch abc; both reviews passed.',
    decisions: [{ key: item.key, digest: item.digest, outcome: 'addressed' as const, reason: 'Red then green.' }],
  };
  const task = { ...receipt, pending: [item] };
  expect(() => validateReceipt(receipt, task)).not.toThrow();
  expect(() => validateReceipt({ ...receipt, decisions: [] }, task)).toThrow();
  expect(() => validateReceipt({ ...receipt, request: 'other' }, task)).toThrow();
  expect(() => validateReceipt({ ...receipt, evidence: '' }, task)).toThrow();
  expect(() =>
    validateReceipt({ ...receipt, decisions: [{ ...receipt.decisions[0]!, digest: 'other' }] }, task),
  ).toThrow();
  expect(() =>
    validateReceipt(
      { ...receipt, decisions: [receipt.decisions[0]!, receipt.decisions[0]!] },
      { ...task, pending: [item, { ...item, key: 'comment:8' }] },
    ),
  ).toThrow();
});

test('CI result order does not cause duplicate repair dispatches', () => {
  const first = { ...snapshot.statusCheckRollup[0], conclusion: 'FAILURE' };
  const second = { ...first, name: 'external', detailsUrl: 'https://github.com/check/2' };
  expect(evaluateFeedback({ ...snapshot, statusCheckRollup: [first, second] }, 'ZWkang/nodebraid', []).request).toBe(
    evaluateFeedback({ ...snapshot, statusCheckRollup: [second, first] }, 'ZWkang/nodebraid', []).request,
  );
});

test('an unresolved thread must be revalidated at the new head before automatic resolution', () => {
  const thread = {
    id: 'PRRT_1',
    isResolved: false,
    path: 'src/index.ts',
    comments: {
      nodes: [{ id: 'PRRC_1', body: 'wrong result', updatedAt: '2026-10-20', url: 'https://github.com/comment/1' }],
      pageInfo: { hasNextPage: false, endCursor: '' },
    },
  };
  const pr = { ...snapshot, threads: [thread] };
  const receipt = {
    number: 42,
    run: 'local-run-123',
    request: 'request1',
    base: 'a'.repeat(40),
    commit: 'b'.repeat(40),
    evidence: 'checked',
    decisions: [{ key: 'PRRT_1', digest: 'digest1', outcome: 'addressed' as const, reason: 'fixed' }],
  };
  expect(currentDecisions(pr, [receipt])).toEqual([]);
  expect(currentDecisions({ ...pr, headRefOid: receipt.commit }, [receipt])).toEqual(receipt.decisions);
});

test('removing opt-in or switching to draft excludes even otherwise actionable feedback', () => {
  const pr = {
    ...snapshot,
    feedback: [{ key: 'comment:1', digest: 'digest1', body: 'fix this', url: 'https://github.com/comment/1' }],
  };
  expect(evaluateFeedback({ ...pr, isDraft: true }, 'ZWkang/nodebraid', []).status).toBe('excluded');
  expect(evaluateFeedback({ ...pr, title: 'Human PR' }, 'ZWkang/nodebraid', []).status).toBe('excluded');
});
