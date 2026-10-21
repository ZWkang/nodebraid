import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { artifactDigest } from './local-agent-run';

interface IssueArchiveInput {
  repository: string;
  readAt: string;
  issue: {
    issue_number: number;
    title: string;
    body: string | null;
    state: string;
    url: string;
    user?: { login: string; [key: string]: unknown } | null;
    created_at?: string | null;
    updated_at?: string | null;
    comments: number;
    [key: string]: unknown;
  };
  comments: {
    id: number;
    url: string;
    body: string;
    user: { login: string; [key: string]: unknown } | null;
    created_at?: string | null;
    updated_at?: string | null;
    [key: string]: unknown;
  }[];
}

export function archiveIssue(value: unknown, outputDir: string) {
  const input = value as IssueArchiveInput;
  assert.ok(input && input.repository === 'ZWkang/nodebraid', 'Expected repository ZWkang/nodebraid.');
  assert.ok(typeof input.readAt === 'string' && Number.isFinite(Date.parse(input.readAt)), 'Invalid readAt.');
  const { issue, comments } = input;
  assert.ok(issue && Number.isSafeInteger(issue.issue_number) && issue.issue_number > 0, 'Invalid issue number.');
  const issueUrl = `https://github.com/ZWkang/nodebraid/issues/${issue.issue_number}`;
  assert.equal(issue.url, issueUrl, 'Issue URL does not match its repository and number.');
  assert.ok(typeof issue.title === 'string' && typeof issue.state === 'string', 'Missing issue title or state.');
  assert.ok(issue.body === null || typeof issue.body === 'string', 'Missing issue body.');
  assert.ok(issue.user == null || typeof issue.user.login === 'string', 'Invalid issue author.');
  assert.ok(Array.isArray(comments), 'Missing issue comments.');
  assert.ok(Number.isSafeInteger(issue.comments) && issue.comments === comments.length, 'Incomplete issue comments.');
  const ids = new Set<number>();
  for (const comment of comments) {
    assert.ok(comment && Number.isSafeInteger(comment.id) && comment.id > 0, 'Invalid comment ID.');
    assert.ok(!ids.has(comment.id), 'Duplicate comment ID.');
    ids.add(comment.id);
    assert.equal(comment.url, `${issueUrl}#issuecomment-${comment.id}`, 'Comment URL belongs to another issue.');
    assert.ok(typeof comment.body === 'string', 'Missing comment body.');
    assert.ok(comment.user === null || typeof comment.user?.login === 'string', 'Missing comment author.');
  }
  const content = { repository: input.repository, issue, comments: [...comments].sort((a, b) => a.id - b.id) };
  const digest = artifactDigest(content);
  const json = `${JSON.stringify({ ...content, readAt: input.readAt, digest }, null, 2)}\n`;
  const markdown = [
    `# #${issue.issue_number} ${issue.title}`,
    '',
    '> GitHub 是需求、规格与任务状态的事实源；此文件是本地阅读和归档的只读副本。',
    '',
    `- 来源：[${input.repository}#${issue.issue_number}](${issue.url})`,
    `- 作者：${issue.user == null ? '来源未提供' : `@${issue.user.login}`}`,
    `- 状态：${issue.state}`,
    `- 读取时间：${input.readAt}`,
    `- 来源创建时间：${issue.created_at ?? '来源未提供'}`,
    `- 来源更新时间：${issue.updated_at ?? '来源未提供'}`,
    `- 内容摘要：${digest}`,
    '',
    '## 正文',
    '',
    issue.body ?? '（GitHub 正文为空）',
    '',
    '## 讨论',
    '',
    ...content.comments.flatMap((comment) => [
      `### 评论 ${comment.id}`,
      '',
      `- 来源：[评论 ${comment.id}](${comment.url})`,
      `- 作者：${comment.user === null ? '来源未提供' : `@${comment.user.login}`}`,
      `- 创建时间：${comment.created_at ?? '来源未提供'}`,
      `- 更新时间：${comment.updated_at ?? '来源未提供'}`,
      '',
      comment.body,
      '',
    ]),
  ].join('\n');
  const directory = resolve(outputDir, String(issue.issue_number));
  const history = join(directory, 'history');
  mkdirSync(history, { recursive: true });
  const archived = !existsSync(join(history, `${digest}.json`));
  for (const [extension, body] of [
    ['json', json],
    ['md', markdown],
  ] as const) {
    const historical = join(history, `${digest}.${extension}`);
    if (!existsSync(historical)) writeFileSync(historical, body, { flag: 'wx' });
    const current = join(directory, `current.${extension}`);
    const temporary = `${current}.${randomUUID()}.tmp`;
    writeFileSync(temporary, body, { flag: 'wx' });
    renameSync(temporary, current);
  }
  return {
    issueNumber: issue.issue_number,
    digest,
    directory,
    currentMarkdown: join(directory, 'current.md'),
    archived,
  };
}
