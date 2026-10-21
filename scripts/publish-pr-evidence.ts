import assert from 'node:assert/strict';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import {
  findEvidencePullRequest,
  loadEvidenceBundle,
  publishEvidence,
  renderEvidenceBlock,
  resolveEvidencePullRequest,
} from './pr-evidence';

const arguments_ = process.argv.slice(2);
if (arguments_[0] === 'prepare') {
  const [, directory, repository, prArgument, head] = arguments_;
  assert.ok(
    directory && repository && head && Number.isSafeInteger(Number(prArgument)),
    'Usage: publish-pr-evidence prepare <directory> <repository> <pr> <head>',
  );
  assert.match(repository, /^[\w.-]+\/[\w.-]+$/);
  const bundle = await loadEvidenceBundle(directory, head);
  const plan = {
    repository,
    pr: Number(prArgument),
    source: bundle.source,
    branch: 'pr-evidence',
    prefix: `pr-${prArgument}/${head}`,
    files: [...bundle.files].map(([path, bytes]) => ({
      path,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    })),
    block: renderEvidenceBlock(bundle, repository, Number(prArgument)),
  };
  await writeFile(resolve(directory, 'publication-input.json'), `${JSON.stringify(plan, null, 2)}\n`);
  console.log(resolve(directory, 'publication-input.json'));
  process.exit(0);
}
const [directory, prArgument, headArgument] = arguments_;
assert.ok(directory, 'Usage: publish-pr-evidence <directory> [pr head]; CI reads GITHUB_EVENT_PATH');
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
assert.ok(
  repository && token,
  'GITHUB_REPOSITORY and GITHUB_TOKEN are required; use connected GitHub tools for local publication when no authenticated token is available.',
);
let pr = Number(prArgument),
  head = headArgument,
  previewOnly = false;
if (!prArgument) {
  assert.ok(process.env.GITHUB_EVENT_PATH, 'Missing workflow_run event');
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const id = event.workflow_run?.id;
  assert.ok(Number.isSafeInteger(id), 'Missing originating workflow run');
  const response = await fetch(`https://api.github.com/repos/${repository}/actions/runs/${id}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  assert.ok(response.ok, `Unable to read source workflow: ${response.status}`);
  const run = (await response.json()) as {
    event: string;
    path: string;
    status: string;
    head_sha: string;
    repository: { full_name: string };
    pull_requests: { number: number }[];
  };
  assert.equal(run.repository.full_name, repository);
  assert.equal(run.path, '.github/workflows/test.yml', 'Unexpected producer workflow');
  assert.equal(run.event, 'pull_request', 'Evidence producer must be a PR run');
  assert.equal(run.status, 'completed', 'Evidence producer is still running');
  head = run.head_sha;
  // workflow_run.pull_requests can be empty; resolve against the actual producer
  // commit and current PR heads, never an issue number supplied by PR code.
  const pulls: Parameters<typeof resolveEvidencePullRequest>[0] = [];
  for (let page = 1; ; page++) {
    const response = await fetch(
      `https://api.github.com/repos/${repository}/commits/${head}/pulls?per_page=100&page=${page}`,
      {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      },
    );
    assert.ok(response.ok, `Unable to resolve the source PR: ${response.status}`);
    const batch = (await response.json()) as typeof pulls;
    pulls.push(...batch);
    if (batch.length < 100) break;
  }
  if (directory === 'preflight') {
    const candidate = findEvidencePullRequest(pulls, repository, head);
    assert.ok(
      candidate === undefined || (Number.isSafeInteger(candidate) && candidate > 0),
      'Invalid source PR number',
    );
    const output = process.env.GITHUB_OUTPUT;
    assert.ok(output, 'Evidence preflight requires GITHUB_OUTPUT');
    await appendFile(output, `publish=${candidate !== undefined}\n`);
    console.log(
      JSON.stringify(
        candidate === undefined
          ? { status: 'not-applicable', reason: 'no-open-current-head-pr', runId: id, head }
          : { status: 'eligible', runId: id, head, pr: candidate },
      ),
    );
    process.exit(0);
  }
  pr = resolveEvidencePullRequest(pulls, repository, head);
  previewOnly = true;
}
assert.ok(head && Number.isSafeInteger(pr) && pr > 0, 'A PR number and exact head are required');
const bundle = await loadEvidenceBundle(directory, head, previewOnly);
const receipt = await publishEvidence(bundle, { repository, pr, token });
await writeFile(resolve(directory, 'publication-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ head: receipt.head, evidenceCommit: receipt.evidenceCommit, url: receipt.url }));
