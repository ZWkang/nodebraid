import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, openSync, closeSync, renameSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import {
  artifactDigest,
  prepareRun,
  validateVerification,
  evaluateVerifiedRun,
  type PreparedRun,
  type VerifiedRun,
} from './local-agent-run';
import { normalizeFeedback } from './github-feedback';
import { planFrontier } from './discovery-queue';
import { archiveIssue } from './local-agent-issue-archive';
import { reconcileDelivery } from './local-agent-reconcile';

const read = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const save = (path: string, value: unknown) => {
  writeFileSync(`${path}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
};
const snapshot = (base: string) => {
  if (git('status', '--porcelain')) throw new Error('Verification requires a clean committed worktree.');
  return {
    head: git('rev-parse', 'HEAD'),
    tree: git('rev-parse', 'HEAD^{tree}'),
    patch: createHash('sha256')
      .update(execFileSync('git', ['diff', '--binary', base, 'HEAD']))
      .digest('hex'),
  };
};

const [mode, first, second, third] = process.argv.slice(2);
if (!first)
  throw new Error(
    'Usage: local-agent archive-issue snapshot.json issues-dir | reconcile source.json [output.json] | normalize raw.json published.json output.json | prepare input.json run-dir | inspect run-dir | frontier run-dir completed.json | verify run-dir reviews.json decisions.json | publication run-dir remote-commit.json | evaluate run-dir snapshot.json',
  );

if (mode === 'archive-issue') {
  if (!second) throw new Error('archive-issue requires a complete Issue snapshot and an issues directory');
  console.log(JSON.stringify(archiveIssue(read(first), resolve(second))));
} else if (mode === 'reconcile') {
  const result = reconcileDelivery(read(first));
  if (second) save(second, result);
  console.log(JSON.stringify(result));
} else if (mode === 'normalize') {
  if (!second || !third)
    throw new Error('normalize requires raw GitHub context, published-feedback.json and output.json');
  const normalized = normalizeFeedback(read(first), read(second));
  save(third, normalized);
  console.log(JSON.stringify(normalized));
} else if (mode === 'prepare') {
  if (!second) throw new Error('prepare requires input.json and run-dir');
  const task = prepareRun(read(first));
  if (!task.baseRefName?.trim()) throw new Error('prepare requires the current PR baseRefName.');
  const directory = resolve(second),
    path = join(directory, 'prepared-task.json');
  mkdirSync(directory, { recursive: true });
  if (existsSync(path)) {
    const stored = read<PreparedRun>(path);
    if (prepareRun(stored).digest !== stored.digest || stored.digest !== task.digest)
      throw new Error('An independent prepared task already exists; start another run.');
  } else writeFileSync(path, `${JSON.stringify(task, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify(task));
} else {
  const directory = resolve(first),
    task = read<PreparedRun>(join(directory, 'prepared-task.json'));
  if (prepareRun(task).digest !== task.digest) throw new Error('Prepared task was modified.');
  if (mode === 'inspect') {
    console.log(JSON.stringify({ taskDigest: task.digest, ...snapshot(task.base) }));
  } else if (mode === 'frontier') {
    if (!second) throw new Error('frontier requires completed-step IDs JSON');
    console.log(JSON.stringify(planFrontier(task.plan, read(second))));
  } else if (mode === 'verify') {
    if (!task.baseRefName?.trim()) throw new Error('Legacy run has no PR baseRefName; prepare a new run.');
    if (!second || !third) throw new Error('verify requires independent review reports and feedback decisions');
    if (git('branch', '--show-current') !== task.branch) throw new Error('Verification is on another branch.');
    git('merge-base', '--is-ancestor', task.base, 'HEAD');
    const before = snapshot(task.base);
    const reviews = read<VerifiedRun['reviews']>(second),
      decisions = read<VerifiedRun['decisions']>(third);
    for (const review of [reviews.standards, reviews.spec]) {
      if (
        review.verdict !== 'passed' ||
        review.head !== before.head ||
        review.tree !== before.tree ||
        review.patch !== before.patch ||
        !review.report.trim()
      )
        throw new Error('Review reports are stale.');
    }
    const log = join(directory, `check-${randomUUID()}.log`),
      fd = openSync(log, 'wx');
    let check;
    try {
      check = spawnSync('bun', ['run', 'check'], { stdio: ['ignore', fd, fd] });
    } finally {
      closeSync(fd);
    }
    let stable = false;
    try {
      stable = artifactDigest(before) === artifactDigest(snapshot(task.base));
    } catch (error) {
      save(join(directory, 'verification-error.json'), { error: String(error), log, before });
    }
    const verified = {
      taskDigest: task.digest,
      ...before,
      checks: { command: 'bun run check', exitCode: check.status, log, stable },
      reviews,
      decisions,
    };
    save(join(directory, 'verification.json'), verified);
    if (check.error) throw check.error;
    if (check.status !== 0 || !stable) throw new Error(`Engineering check failed or changed source; inspect ${log}`);
    validateVerification(task, verified as VerifiedRun);
    console.log(JSON.stringify(verified));
  } else if (mode === 'publication') {
    if (!second) throw new Error('publication requires the actual GitHub Git commit JSON');
    const verified = read<VerifiedRun>(join(directory, 'verification.json'));
    validateVerification(task, verified);
    if (
      artifactDigest(snapshot(task.base)) !==
      artifactDigest({ head: verified.head, tree: verified.tree, patch: verified.patch })
    )
      throw new Error('Local source changed after verification.');
    const remote = read<{ sha: string; tree: { sha: string }; parents: { sha: string }[] }>(second);
    if (!/^[a-f0-9]{40}$/.test(remote.sha) || remote.tree.sha !== verified.tree || remote.parents[0]?.sha !== task.base)
      throw new Error('Remote tree or append-only parent differs from the prepared/verified source.');
    const publication = {
      taskDigest: task.digest,
      head: remote.sha,
      tree: remote.tree.sha,
      localHead: verified.head,
      parent: remote.parents[0]!.sha,
    };
    const path = join(directory, 'publication.json');
    if (existsSync(path)) {
      if (artifactDigest(read(path)) !== artifactDigest(publication))
        throw new Error('Publication changed; prepare a new run.');
    } else writeFileSync(path, `${JSON.stringify(publication, null, 2)}\n`, { flag: 'wx' });
    console.log(JSON.stringify(publication));
  } else if (mode === 'evaluate') {
    if (!second) throw new Error('evaluate requires a complete current-head snapshot');
    const verified = read<VerifiedRun>(join(directory, 'verification.json'));
    if (!existsSync(verified.checks.log)) throw new Error('Original engineering check log is missing.');
    console.log(
      JSON.stringify(evaluateVerifiedRun(task, verified, read(join(directory, 'publication.json')), read(second))),
    );
  } else throw new Error('Unknown local-agent command.');
}
