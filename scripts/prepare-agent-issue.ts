import { mkdir } from 'node:fs/promises';

export interface AgentIssue {
  number: number;
  state: string;
  title: string;
  body: string;
  url: string;
  labels: { name: string }[];
  comments: unknown[];
}

export function parseIssueNumber(value: string | undefined): number {
  if (!value || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new Error('ISSUE_NUMBER must be a positive safe integer.');
  }
  return Number(value);
}

export function validateAgentIssue(issue: AgentIssue, expectedNumber: number): void {
  if (issue.number !== expectedNumber) {
    throw new Error(`Requested issue #${expectedNumber}, received #${issue.number}.`);
  }
  if (issue.state !== 'OPEN') {
    throw new Error(`Issue #${issue.number} is ${issue.state}; delivery requires an open issue.`);
  }
  const labels = new Set(issue.labels.map((label) => label.name));
  if (!labels.has('ready-for-agent') || (!labels.has('bug') && !labels.has('approved-spec'))) {
    throw new Error(`Issue #${issue.number} requires ready-for-agent and bug or approved-spec.`);
  }
  if (labels.has('needs-info') || labels.has('needs-design')) {
    throw new Error(`Issue #${issue.number} still needs information or design decisions.`);
  }
}

if (import.meta.main) {
  const number = parseIssueNumber(process.env.ISSUE_NUMBER);
  const repository = process.env.ISSUE_REPOSITORY;
  if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository)) {
    throw new Error('ISSUE_REPOSITORY must identify owner/repository.');
  }
  const result = Bun.spawn(
    [
      'gh',
      'issue',
      'view',
      String(number),
      '--repo',
      repository,
      '--json',
      'number,state,title,body,url,labels,comments',
    ],
    { stdout: 'pipe', stderr: 'inherit' },
  );
  const output = await new Response(result.stdout).text();
  const exitCode = await result.exited;
  if (exitCode !== 0) {
    throw new Error(`GitHub issue read failed with exit code ${exitCode}.`);
  }
  const issue = JSON.parse(output) as AgentIssue;
  validateAgentIssue(issue, number);
  await mkdir('.tmp', { recursive: true });
  await Bun.write('.tmp/agent-issue.json', JSON.stringify(issue, null, 2));
  console.log(`Prepared ${repository}#${number}: ${issue.title}`);
}
