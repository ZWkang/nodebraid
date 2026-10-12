import { expect, test } from 'bun:test';
import { parseIssueNumber, validateAgentIssue, type AgentIssue } from '../scripts/prepare-agent-issue';

function issue(labels: string[], state = 'OPEN'): AgentIssue {
  return {
    number: 42,
    state,
    title: 'Dispose fails to release the renderer target',
    body: 'Reproduction and expected behavior are recorded in the investigation.',
    url: 'https://github.com/ZWkang/nodebraid/issues/42',
    labels: labels.map((name) => ({ name })),
    comments: [],
  };
}

test('accepts an issue number without interpreting command or expression input', () => {
  expect(parseIssueNumber('42')).toBe(42);
  for (const value of [undefined, '', '0', '-1', '1.2', '01', '42; echo injected', '9007199254740992']) {
    expect(() => parseIssueNumber(value)).toThrow('positive safe integer');
  }
});

test('allows confirmed bugs and approved specifications to enter autonomous delivery', () => {
  expect(() => validateAgentIssue(issue(['bug', 'ready-for-agent']), 42)).not.toThrow();
  expect(() => validateAgentIssue(issue(['approved-spec', 'ready-for-agent']), 42)).not.toThrow();
});

test('rejects a different issue and closed work', () => {
  expect(() => validateAgentIssue(issue(['bug', 'ready-for-agent']), 43)).toThrow('received #42');
  expect(() => validateAgentIssue(issue(['bug', 'ready-for-agent'], 'CLOSED'), 42)).toThrow('requires an open issue');
});

test('does not turn untriaged reports or unresolved design questions into coding tasks', () => {
  for (const labels of [
    ['bug'],
    ['ready-for-agent'],
    ['enhancement', 'ready-for-agent'],
    ['bug', 'ready-for-agent', 'needs-info'],
    ['approved-spec', 'ready-for-agent', 'needs-design'],
  ]) {
    expect(() => validateAgentIssue(issue(labels), 42)).toThrow();
  }
});
