import { expect, test } from 'bun:test';
import { normalizeFeedback, restPages, type GitHubFeedback } from '../scripts/github-feedback';
import { evaluateFeedback } from '../scripts/pr-feedback';

test('pagination must finish, including the empty page after an exact page boundary', () => {
  expect(() => restPages([Array.from({ length: 100 }, (_, id) => ({ id }))])).toThrow('pagination');
  expect(restPages([Array.from({ length: 100 }, (_, id) => ({ id })), []])).toHaveLength(100);
});

test('edited and resolved-thread replies enter feedback while current-head workflow identity is checked', () => {
  const head = 'a'.repeat(40);
  const raw: GitHubFeedback = {
    pr: {
      number: 11,
      title: '[local-agent] fix',
      state: 'open',
      draft: false,
      head: { sha: head, ref: 'feat/issue-10', repo: { full_name: 'ZWkang/nodebraid' } },
      base: { ref: 'main', sha: 'b'.repeat(40) },
      mergeable: true,
      mergeable_state: 'clean',
    },
    comments: [[{ id: 1, body: 'new correction', updated_at: '2026-10-20', html_url: 'https://github.com/comment/1' }]],
    reviews: [[]],
    threads: [
      {
        nodes: [
          {
            id: 'thread',
            isResolved: true,
            path: 'x.ts',
            comments: {
              nodes: [{ id: 'reply', body: 'still broken', updatedAt: '2026-10-20', url: 'https://github.com/reply' }],
              pageInfo: { hasNextPage: false, endCursor: '' },
            },
          },
        ],
        pageInfo: { hasNextPage: false, endCursor: '' },
      },
    ],
    checks: {
      total_count: 1,
      check_runs: [
        {
          name: 'checks',
          status: 'completed',
          conclusion: 'success',
          head_sha: head,
          html_url: 'https://github.com/ZWkang/nodebraid/actions/runs/123/job/1',
        },
      ],
    },
    statuses: { sha: head, total_count: 0, statuses: [] },
    workflows: {
      total_count: 1,
      workflow_runs: [
        {
          id: 123,
          name: 'Checks',
          path: '.github/workflows/test.yml',
          head_sha: head,
          status: 'completed',
          conclusion: 'success',
        },
      ],
    },
  };
  const normalized = normalizeFeedback(raw, []);
  expect(normalized.baseRefOid).toBe('b'.repeat(40));
  expect(() => normalizeFeedback({ ...raw, pr: { ...raw.pr, base: { ref: 'main', sha: '' } } }, [])).toThrow(
    'target base SHA',
  );
  expect(normalized.feedback.map((item) => item.key)).toEqual(['comment:1', 'thread']);
  expect(normalized.statusCheckRollup[0]!.workflowName).toBe('Checks');
  const requested = normalizeFeedback(
    {
      ...raw,
      comments: [[]],
      threads: [{ nodes: [], pageInfo: { hasNextPage: false, endCursor: '' } }],
      reviews: [
        [
          {
            id: 2,
            body: 'Needs correction',
            state: 'CHANGES_REQUESTED',
            submitted_at: '2026-10-20',
            html_url: 'https://github.com/review/2',
            user: { login: 'maintainer' },
          },
          {
            id: 3,
            body: 'Unsubmitted draft',
            state: 'PENDING',
            submitted_at: null,
            html_url: 'https://github.com/review/3',
            user: { login: 'maintainer' },
          },
          {
            id: 4,
            body: 'More context',
            state: 'COMMENTED',
            submitted_at: '2026-10-21',
            html_url: 'https://github.com/review/4',
            user: { login: 'maintainer' },
          },
        ],
      ],
    },
    [],
  );
  expect(
    evaluateFeedback(
      requested,
      'ZWkang/nodebraid',
      requested.feedback.map((item) => ({
        key: item.key,
        digest: item.digest,
        outcome: 'addressed' as const,
        reason: 'Code corrected; human decision still remains',
      })),
    ).status,
  ).toBe('waiting-review');
  expect(() =>
    normalizeFeedback(
      {
        ...raw,
        statuses: {
          sha: 'b'.repeat(40),
          total_count: 1,
          statuses: [{ context: 'external', state: 'success', target_url: 'https://github.com/status' }],
        },
      },
      [],
    ),
  ).toThrow('head');
  expect(() =>
    normalizeFeedback(
      {
        ...raw,
        workflows: {
          ...raw.workflows,
          workflow_runs: [{ ...raw.workflows.workflow_runs[0]!, head_sha: 'b'.repeat(40) }],
        },
      },
      [],
    ),
  ).toThrow('head');
  expect(() =>
    normalizeFeedback(
      { ...raw, threads: [{ ...raw.threads[0]!, pageInfo: { hasNextPage: true, endCursor: 'next' } }] },
      [],
    ),
  ).toThrow('pagination');
});
