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
