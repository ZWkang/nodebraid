import { expect, test } from 'bun:test';
import { evaluateVerifiedRun, prepareRun, validateVerification, type VerifiedRun } from '../scripts/local-agent-run';
import type { FeedbackSnapshot } from '../scripts/pr-feedback';

const sha = (value: string) => value.repeat(40);
const snapshot: FeedbackSnapshot = {
  number: 11,
  title: '[local-agent] fix workflow',
  state: 'OPEN',
  isDraft: false,
  headRefName: 'feat/issue-10',
  headRefOid: sha('b'),
  headRepository: { nameWithOwner: 'ZWkang/nodebraid' },
  baseRefName: 'main',
  baseRefOid: sha('a'),
  mergeable: 'MERGEABLE',
  mergeStateStatus: 'CLEAN',
  reviewDecision: '',
  statusCheckRollup: [
    { name: 'checks', workflowName: 'Checks', status: 'COMPLETED', conclusion: 'SUCCESS', headSha: sha('b') },
  ],
  feedback: [],
  threads: [],
};

test('a new green head cannot inherit the previous tree, reviews or test evidence', () => {
  const task = prepareRun({
    run: 'run-1',
    repository: 'ZWkang/nodebraid',
    source: { kind: 'issue', number: 10 },
    branch: 'feat/issue-10',
    baseRefName: 'feat/issue-9',
    base: sha('a'),
    expectedParent: sha('f'),
    request: 'approved-scope',
    pending: [],
    plan: [{ id: 'fix', blockedBy: [], acceptance: 'Regression red then green' }],
  });
  const verified: VerifiedRun = {
    taskDigest: task.digest,
    head: sha('c'),
    tree: sha('d'),
    patch: 'e'.repeat(64),
    checks: { command: 'bun run check', exitCode: 0, log: 'checks.log', stable: true },
    reviews: {
      standards: {
        head: sha('c'),
        tree: sha('d'),
        patch: 'e'.repeat(64),
        verdict: 'passed',
        report: 'Standards passed',
      },
      spec: { head: sha('c'), tree: sha('d'), patch: 'e'.repeat(64), verdict: 'passed', report: 'Spec passed' },
    },
    decisions: [],
  };
  const publication = {
    taskDigest: task.digest,
    head: sha('b'),
    tree: sha('d'),
    localHead: sha('c'),
    parent: sha('f'),
  };
  expect(evaluateVerifiedRun(task, verified, publication, { ...snapshot, baseRefName: 'feat/issue-9' }).status).toBe(
    'needs-integration',
  );
  expect(evaluateVerifiedRun(task, verified, publication, snapshot).status).toBe('waiting-verification');
  expect(
    evaluateVerifiedRun(task, verified, publication, {
      ...snapshot,
      baseRefName: 'feat/issue-9',
      baseRefOid: sha('f'),
    }).status,
  ).toBe('waiting-verification');
  expect(() => evaluateVerifiedRun(task, verified, { ...publication, parent: task.base }, snapshot)).toThrow(
    'append parent',
  );
  expect(() => validateVerification({ ...task, expectedParent: task.base }, verified)).toThrow(
    'independent prepared task',
  );
  const { baseRefName: _, expectedParent: _parent, digest: __, ...legacyInput } = task;
  const legacy = prepareRun(legacyInput);
  expect(Object.hasOwn(legacy, 'baseRefName')).toBe(false);
  expect(legacy.digest).toBe('bcda8468a65cc217787611b585e374580213e1125f96f0d30f14a1ee70f116ce');
  const legacyResult = evaluateVerifiedRun(
    legacy,
    { ...verified, taskDigest: legacy.digest },
    { ...publication, taskDigest: legacy.digest },
    snapshot,
  );
  expect(legacyResult.status).toBe('waiting-verification');
  const legacyWithBase = prepareRun({ ...legacyInput, baseRefName: 'feat/issue-9' });
  expect(Object.hasOwn(legacyWithBase, 'expectedParent')).toBe(false);
  expect(
    evaluateVerifiedRun(
      legacyWithBase,
      { ...verified, taskDigest: legacyWithBase.digest },
      { ...publication, taskDigest: legacyWithBase.digest },
      { ...snapshot, baseRefName: 'feat/issue-9' },
    ).status,
  ).toBe('waiting-verification');
  expect(() => validateVerification({ ...task, request: 'unprepared-request' }, verified)).toThrow(
    'independent prepared task',
  );
  expect(() => validateVerification(task, { ...verified, tree: sha('f') })).toThrow('exact checked');
  expect(() =>
    validateVerification(task, {
      ...verified,
      reviews: {
        ...verified.reviews,
        standards: { ...verified.reviews.standards, verdict: 'changes-requested', report: 'Must fix; do not ship' },
      },
    }),
  ).toThrow('reviews');
  expect(
    evaluateVerifiedRun(task, verified, publication, {
      ...snapshot,
      headRefOid: sha('f'),
      statusCheckRollup: snapshot.statusCheckRollup.map((c) => ({ ...c, headSha: sha('f') })),
    }).status,
  ).toBe('waiting-verification');
});
