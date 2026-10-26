import { expect, test } from 'bun:test';
import { summarizeRisk, validateRiskAssessment, type RiskAssessment } from '../scripts/pr-risk';

const low: RiskAssessment = {
  level: 'low',
  rationale: 'The correction is isolated and preserves existing behavior and public contracts.',
  evidence: 'The complete diff and connected caller tests were reviewed.',
  rollback: 'Revert this commit without changing stored data.',
};
const reviews = { standards: { risk: low }, spec: { risk: low } };

test('both reviewers and changed-file evidence are required before a low risk route', () => {
  expect(summarizeRisk(reviews, ['docs/guide.md'])).toMatchObject({ level: 'low', route: 'automatic' });
  for (const input of [undefined, []])
    expect(summarizeRisk(reviews, input)).toMatchObject({ level: 'unclassified', route: 'full-human' });
  expect(summarizeRisk({ standards: {}, spec: { risk: low } }, ['docs/guide.md'])).toMatchObject({
    level: 'unclassified',
    route: 'full-human',
  });
  expect(summarizeRisk({ standards: {}, spec: {} }, ['README.md'])).toMatchObject({
    level: 'unclassified',
    route: 'full-human',
  });
  expect(
    summarizeRisk({ standards: { risk: { ...low, level: 'high' } }, spec: { risk: low } }, ['docs/guide.md']),
  ).toMatchObject({ level: 'high', route: 'full-human' });
});

test.each([
  'AGENTS.md',
  'packages/core/AGENTS.md',
  'CLAUDE.md',
  '.agents/skills/review/SKILL.md',
  '.claude/settings.json',
  '.codebuddy/settings.json',
  '.github/workflows/test.yml',
  'docs/agents/pr-risk.md',
  'scripts/check.ts',
  'website/scripts/check.ts',
  'package.json',
  'packages/core/package.json',
  'bun.lock',
  'tsconfig.agents.json',
  'packages/core/tsconfig.build.json',
  'examples/app/vite.config.ts',
  'website/.vitepress/config.mts',
  '.prettierignore',
])('control or verification path %s cannot be downgraded by low assessments', (path) => {
  expect(summarizeRisk(reviews, [path])).toMatchObject({ level: 'high', route: 'full-human' });
});

test.each(['src/index.ts', 'packages/kernel/src/index.ts'])(
  'public implementation %s needs at least quick human review',
  (path) => {
    expect(summarizeRisk(reviews, [path])).toMatchObject({ level: 'medium', route: 'quick-human' });
  },
);

test('reviewer risk can raise a path minimum and missing assessments never infer safety from file names', () => {
  expect(summarizeRisk({ ...reviews, spec: { risk: { ...low, level: 'high' } } }, ['src/index.ts'])).toMatchObject({
    level: 'high',
  });
  expect(summarizeRisk({ standards: {}, spec: {} }, ['docs/guide.md'])).toMatchObject({ level: 'unclassified' });
  expect(summarizeRisk(reviews, ['docs/a guide\nwith a newline.md'])).toMatchObject({ level: 'low' });
});

test('a symlink at a protected directory path retains that directory risk', () => {
  for (const path of ['.agents', 'scripts', 'docs/agents', 'packages/core/artifacts'])
    expect(summarizeRisk(reviews, [path])).toMatchObject({ level: 'high' });
  expect(summarizeRisk(reviews, ['packages/core/src'])).toMatchObject({ level: 'medium' });
});

test('malformed assessments and non-Git paths fail explicitly instead of becoming low risk', () => {
  for (const value of [
    undefined,
    null,
    {},
    { ...low, level: 'safe' },
    { ...low, rationale: '' },
    { ...low, evidence: '  ' },
    { ...low, rollback: 42 },
  ])
    expect(() => validateRiskAssessment(value)).toThrow('Risk assessment');
  for (const paths of [
    ['../AGENTS.md'],
    ['/AGENTS.md'],
    ['./AGENTS.md'],
    ['docs//guide.md'],
    ['docs/guide.md', 'docs/guide.md'],
  ])
    expect(() => summarizeRisk(reviews, paths)).toThrow('Changed files');
});
