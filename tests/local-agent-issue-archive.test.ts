import { afterEach, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { archiveIssue } from '../scripts/local-agent-issue-archive';

const directories: string[] = [];
const directory = () => {
  const path = mkdtempSync(join(tmpdir(), 'nodebraid-issue-archive-'));
  directories.push(path);
  return path;
};
afterEach(() => {
  for (const path of directories.splice(0)) rmSync(path, { recursive: true });
});

const snapshot = () => ({
  repository: 'ZWkang/nodebraid',
  readAt: '2026-10-21T02:00:00.000Z',
  issue: {
    issue_number: 42,
    title: 'Keep the approved spec',
    body: '## Scope\n\nPreserve **every paragraph**.\n\n```ts\nconst approved = true;\n```',
    state: 'open',
    url: 'https://github.com/ZWkang/nodebraid/issues/42',
    user: { login: 'spec-author' },
    created_at: '2026-10-20T01:00:00Z',
    updated_at: '2026-10-21T01:00:00Z',
    comments: 1,
    labels: [{ name: 'approved-spec' }],
    connector_extra: { retained: true },
  },
  comments: [
    {
      id: 101,
      url: 'https://github.com/ZWkang/nodebraid/issues/42#issuecomment-101',
      body: 'Approved scope.\n\n> Keep this source quotation.',
      user: { login: 'maintainer', url: 'https://github.com/maintainer' },
      created_at: null,
      updated_at: null,
    },
  ],
});

test('archives the complete issue and discussion as a readable local copy', () => {
  const input = snapshot();
  const result = archiveIssue(input, directory());
  const markdown = readFileSync(result.currentMarkdown, 'utf8');
  expect(markdown).toContain(input.issue.body);
  expect(markdown).toContain(input.comments[0]!.body);
  expect(markdown).toContain(input.comments[0]!.url);
  expect(markdown).toContain('maintainer');
  expect(markdown).toContain('spec-author');
  expect(markdown).toContain(input.issue.created_at);
  expect(markdown).toContain('GitHub');
  expect(markdown).toContain('只读副本');
  expect(markdown).toContain(input.readAt);
  const current = JSON.parse(readFileSync(join(result.directory, 'current.json'), 'utf8'));
  expect(current).toMatchObject(input);
  expect(readdirSync(join(result.directory, 'history')).sort()).toEqual([
    `${result.digest}.json`,
    `${result.digest}.md`,
  ]);
});

test('refreshes the current read time without replacing identical historical content', () => {
  const output = directory();
  const input = snapshot();
  input.issue.comments = 2;
  input.comments.unshift({
    ...input.comments[0]!,
    id: 102,
    url: `${input.issue.url}#issuecomment-102`,
    body: 'Later.',
  });
  const first = archiveIssue(input, output);
  const original = readFileSync(join(first.directory, 'history', `${first.digest}.json`), 'utf8');
  const originalMarkdown = readFileSync(join(first.directory, 'history', `${first.digest}.md`), 'utf8');
  const refreshed = { ...input, readAt: '2026-10-21T03:00:00.000Z', comments: [...input.comments].reverse() };
  const second = archiveIssue(refreshed, output);
  expect(second.digest).toBe(first.digest);
  expect(second.archived).toBe(false);
  expect(readdirSync(join(first.directory, 'history'))).toHaveLength(2);
  expect(readFileSync(join(first.directory, 'history', `${first.digest}.json`), 'utf8')).toBe(original);
  expect(readFileSync(join(first.directory, 'history', `${first.digest}.md`), 'utf8')).toBe(originalMarkdown);
  expect(JSON.parse(readFileSync(join(first.directory, 'current.json'), 'utf8')).readAt).toBe(refreshed.readAt);
  const markdown = readFileSync(first.currentMarkdown, 'utf8');
  expect(markdown.indexOf('### 评论 101')).toBeLessThan(markdown.indexOf('### 评论 102'));
  expect(input.comments[0]!.id).toBe(102);
});

test('keeps earlier versions when either the specification or its comments are edited', () => {
  const output = directory();
  const input = snapshot();
  const first = archiveIssue(input, output);
  input.issue.body = '## Scope\n\nUpdated specification.';
  const changedBody = archiveIssue(input, output);
  input.comments[0]!.body = 'Approved the updated scope.';
  const changedComment = archiveIssue(input, output);
  expect(new Set([first.digest, changedBody.digest, changedComment.digest]).size).toBe(3);
  expect(readdirSync(join(first.directory, 'history'))).toHaveLength(6);
  expect(readFileSync(join(first.directory, 'history', `${first.digest}.md`), 'utf8')).toContain('**every paragraph**');
  expect(readFileSync(join(first.directory, 'history', `${changedBody.digest}.md`), 'utf8')).toContain(
    'Approved scope.',
  );
  expect(readFileSync(changedComment.currentMarkdown, 'utf8')).toContain('Approved the updated scope.');
});

test('archives closed specifications with no execution labels or body', () => {
  const input = { ...snapshot(), issue: { ...snapshot().issue, state: 'closed', labels: [], body: null } };
  const result = archiveIssue(input, directory());
  expect(readFileSync(result.currentMarkdown, 'utf8')).toContain('- 状态：closed');
  expect(JSON.parse(readFileSync(join(result.directory, 'current.json'), 'utf8')).issue.body).toBeNull();
});

test('rejects incomplete or mismatched input without changing the current copy or history', () => {
  const output = directory();
  const input = snapshot();
  const first = archiveIssue(input, output);
  const originalJson = readFileSync(join(first.directory, 'current.json'), 'utf8');
  const originalMarkdown = readFileSync(first.currentMarkdown, 'utf8');
  const invalid = [
    { ...input, repository: 'someone/else' },
    { ...input, readAt: 'not a timestamp' },
    { ...input, issue: { ...input.issue, issue_number: -1 } },
    { ...input, issue: { ...input.issue, url: 'https://github.com/someone/else/issues/42' } },
    { ...input, issue: { ...input.issue, body: undefined } },
    { ...input, issue: { ...input.issue, comments: 2 } },
    { ...input, comments: undefined },
    { ...input, comments: [{ ...input.comments[0], body: undefined }] },
    {
      ...input,
      comments: [{ ...input.comments[0], url: 'https://github.com/ZWkang/nodebraid/issues/43#issuecomment-101' }],
    },
    { ...input, issue: { ...input.issue, comments: 2 }, comments: [input.comments[0], input.comments[0]] },
  ];
  for (const candidate of invalid) {
    expect(() => archiveIssue(candidate, output)).toThrow();
    expect(readFileSync(join(first.directory, 'current.json'), 'utf8')).toBe(originalJson);
    expect(readFileSync(first.currentMarkdown, 'utf8')).toBe(originalMarkdown);
    expect(readdirSync(join(first.directory, 'history'))).toHaveLength(2);
  }
});
