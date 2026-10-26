import { spawnSync } from 'node:child_process';

const requiredFiles = [
  'AGENTS.md',
  'CONTEXT.md',
  '.agents/workflows/local-agent.md',
  'docs/agents/agentic-workflows.md',
  'docs/agents/issue-tracker.md',
  'docs/agents/principles.md',
  '.agents/skills/PSTACK-LICENSE',
  'scripts/local-agent.ts',
  'scripts/local-agent-run.ts',
  'scripts/pr-risk.ts',
  'scripts/local-agent-reconcile.ts',
  'scripts/github-feedback.ts',
  'scripts/discovery.ts',
  'scripts/discovery-queue.ts',
  'scripts/collect-preview.ts',
  'scripts/pr-evidence.ts',
  'scripts/verification-report.ts',
  '.agents/skills/verify-nodebraid/SKILL.md',
  ...['tdd', 'code-review', 'ponytail', 'ponytail-review', 'pr', 'pr-risk', 'show-me'].map(
    (name) => `.agents/skills/${name}/SKILL.md`,
  ),
  ...[
    'attack-the-premise',
    'boundary-discipline',
    'build-the-lever',
    'encode-lessons-in-structure',
    'exhaust-the-design-space',
    'experience-first',
    'explain-the-number',
    'fix-root-causes',
    'foundational-thinking',
    'guard-the-context-window',
    'laziness-protocol',
    'make-operations-idempotent',
    'migrate-callers-then-delete-legacy-apis',
    'minimize-reader-load',
    'model-the-domain',
    'never-block-on-the-human',
    'outcome-oriented-execution',
    'prove-it-works',
    'redesign-from-first-principles',
    'separate-before-serializing-shared-state',
    'sequence-verifiable-units',
    'subtract-before-you-add',
    'test-behavior-not-implementation',
    'type-system-discipline',
  ].map((name) => `.agents/skills/principle-${name}/SKILL.md`),
];
for (const path of requiredFiles) {
  if (!(await Bun.file(path).exists())) throw new Error(`Missing local workflow source: ${path}`);
}

// The selected executor is subscription-authenticated local Codex, so hosted AI must be absent.
for await (const path of new Bun.Glob('.github/workflows/*').scan('.')) {
  if (!/\.(?:ya?ml|md)$/.test(path)) continue;
  const source = await Bun.file(path).text();
  if (/CODEX_API_KEY|OPENAI_API_KEY|github\/gh-aw|pr-feedback\.lock\.yml/.test(source)) {
    throw new Error(`Hosted API execution remains in ${path}; local subscription mode must not dispatch it.`);
  }
}

if (process.argv.includes('--local')) {
  if (process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY) {
    throw new Error('API-key environment variables are set; local workflow requires ChatGPT authentication.');
  }
  const result = spawnSync('codex', ['login', 'status'], { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0 || !`${result.stdout}${result.stderr}`.includes('Logged in using ChatGPT')) {
    throw new Error('Local Codex is not authenticated with ChatGPT. Complete codex login before running the worker.');
  }
}
console.log('Local agent workflow sources verified; no hosted API workflow is active in this checkout.');
