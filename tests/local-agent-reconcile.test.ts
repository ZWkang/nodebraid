import { expect, test } from 'bun:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { ReconciliationInput } from '../scripts/local-agent-reconcile';

const cli = resolve('scripts/local-agent.ts');
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'nodebraid-reconcile-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Reconcile test');
  git('config', 'user.email', 'reconcile@example.invalid');
  git('config', 'core.hooksPath', '.git/hooks');
  const commit = (name: string) => {
    writeFileSync(join(dir, name), name);
    git('add', name);
    git('commit', '-qm', name);
    return git('rev-parse', 'HEAD');
  };
  const main = commit('base');
  git('update-ref', 'refs/remotes/origin/main', main);
  git('switch', '-qc', 'feat/issue-41');
  commit('upstream');
  git('switch', '-qc', 'feat/issue-42');
  const delivery = commit('delivery');
  git('switch', '-q', 'feat/issue-41');
  git('merge', '--no-ff', '-qm', 'merge stacked delivery', 'feat/issue-42');
  const merge = git('rev-parse', 'HEAD');
  const issue = (number: number, state = 'OPEN') => ({
    number,
    state,
    title: 'Spec: delivery',
    body: 'Approved requirement',
    url: 'https://github.com/ZWkang/nodebraid/issues/' + number,
    labels: [{ name: 'approved-spec' }, { name: 'ready-for-agent' }],
    comments: [],
    assignees: [],
  });
  const control = {
    approval: 'https://github.com/ZWkang/nodebraid/issues/37#issuecomment-1',
    execution: 'agent' as const,
    owner: null,
  };
  const input: ReconciliationInput = {
    repository: { full_name: 'ZWkang/nodebraid', default_branch: 'main' },
    main,
    actor: 'ZWkang',
    executor: 'recovery',
    closeAuthorization: 'user request in recovery chat',
    specs: [
      {
        issue: issue(37),
        ...control,
        children: [[{ number: 42 }]],
        slices: [{ id: 'delivery', task: 42 }],
        acceptance: [{ id: 'end-to-end', evidence: null as string | null }],
      },
    ],
    tasks: [
      {
        issue: issue(42),
        ...control,
        parent: 37,
        blockers: [[]],
        pullRequests: [49],
        delivery: 49,
        acceptance: [{ id: 'delivery', evidence: 'https://github.com/ZWkang/nodebraid/pull/49#issuecomment-2' }],
      },
    ],
    pullRequests: [
      {
        number: 49,
        title: '[local-agent] delivery',
        draft: false,
        state: 'closed',
        merged: true,
        merge_commit_sha: merge,
        head: { ref: 'feat/issue-42', sha: delivery, repo: { full_name: 'ZWkang/nodebraid' } },
        base: { ref: 'feat/issue-41', repo: { full_name: 'ZWkang/nodebraid' } },
        html_url: 'https://github.com/ZWkang/nodebraid/pull/49',
      },
    ],
  };
  const invoke = (source: unknown = input) => {
    writeFileSync(join(dir, 'input.json'), JSON.stringify(source));
    return spawnSync(process.execPath, [cli, 'reconcile', 'input.json'], { cwd: dir, encoding: 'utf8' });
  };
  return { dir, git, input, invoke, cleanup: () => rmSync(dir, { recursive: true }) };
}

test('merged stacked delivery remains incomplete until its real merge commit reaches fetched main', () => {
  const f = fixture();
  try {
    let result = f.invoke();
    expect(result.status).toBe(0);
    let report = JSON.parse(result.stdout);
    expect(report.tasks[0].status).toBe('needs-integration');
    expect(report.integration).toEqual([{ issue: 42, pullRequest: 49 }]);
    expect(report.tasks[0].canClose).toBe(false);
    expect(report.specs[0].canClose).toBe(false);
    expect(report.specs[0].title).toBe('spec: delivery');
    f.input.tasks[0]!.issue.state = 'CLOSED';
    expect(JSON.parse(f.invoke().stdout).tasks[0].status).toBe('needs-integration');
    f.input.tasks[0]!.issue.state = 'OPEN';
    f.git('switch', '-q', 'main');
    f.git('merge', '--no-ff', '-qm', 'integrate feature', 'feat/issue-41');
    f.input.main = f.git('rev-parse', 'HEAD');
    f.git('update-ref', 'refs/remotes/origin/main', f.input.main);
    result = f.invoke();
    expect(result.status).toBe(0);
    report = JSON.parse(result.stdout);
    expect(report.tasks[0].status).toBe('delivered');
    expect(report.tasks[0].canClose).toBe(true);
    expect(report.specs[0].canClose).toBe(false);
    f.input.tasks[0]!.issue.state = 'CLOSED';
    f.input.tasks[0]!.issue.assignees = [{ login: 'original-implementer' }];
    expect(JSON.parse(f.invoke().stdout).specs[0].status).toBe('needs-acceptance');
    f.input.specs[0]!.acceptance[0]!.evidence = 'https://github.com/ZWkang/nodebraid/issues/37#issuecomment-3';
    expect(JSON.parse(f.invoke().stdout).specs[0].canClose).toBe(true);
    f.input.closeAuthorization = '';
    expect(JSON.parse(f.invoke().stdout).specs[0].status).toBe('waiting-authorization');
  } finally {
    f.cleanup();
  }
}, 30_000);

test('incomplete PR decision metadata cannot send an already integrated implementation back to the frontier', () => {
  const f = fixture();
  try {
    f.git('switch', '-q', 'main');
    f.git('merge', '--no-ff', '-qm', 'integrate feature', 'feat/issue-41');
    f.input.main = f.git('rev-parse', 'HEAD');
    f.git('update-ref', 'refs/remotes/origin/main', f.input.main);
    expect(JSON.parse(f.invoke().stdout).tasks[0].status).toBe('delivered');
    for (const change of [
      { merged: undefined },
      { merged: null },
      { merged: 'false' },
      { draft: undefined },
      { draft: null },
      { draft: 'false' },
      { state: undefined },
      { state: null },
      { state: 'MERGED' },
      { state: 'open' },
    ]) {
      const result = f.invoke({ ...f.input, pullRequests: [{ ...f.input.pullRequests[0], ...change }] });
      expect(result.stdout).toBe('');
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('complete PR metadata');
    }
  } finally {
    f.cleanup();
  }
}, 30_000);

test('invalid task and parent issue states fail before deriving delivery or closure candidates', () => {
  const f = fixture();
  try {
    for (const collection of ['tasks', 'specs'] as const) {
      for (const state of [undefined, null, 'MERGED', 'open']) {
        const result = f.invoke({
          ...f.input,
          [collection]: f.input[collection].map((item) => ({ ...item, issue: { ...item.issue, state } })),
        });
        expect(result.stdout).toBe('');
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('normalized OPEN or CLOSED state');
      }
    }
  } finally {
    f.cleanup();
  }
}, 30_000);

test('an open stacked PR is retargeted only after its upstream is integrated, then requires fresh verification', () => {
  const f = fixture();
  try {
    const pr = f.input.pullRequests[0]!;
    pr.state = 'open';
    pr.merged = false;
    const upstream = structuredClone(pr);
    upstream.number = 46;
    upstream.state = 'closed';
    upstream.merged = true;
    upstream.head.ref = 'feat/issue-41';
    upstream.base.ref = 'main';
    f.input.pullRequests.push(upstream);
    pr.merge_commit_sha = null;
    expect(JSON.parse(f.invoke().stdout).pullRequests[0].status).toBe('maintain');
    f.git('switch', '-q', 'main');
    f.git('merge', '--no-ff', '-qm', 'integrate upstream', 'feat/issue-41');
    f.input.main = f.git('rev-parse', 'HEAD');
    f.git('update-ref', 'refs/remotes/origin/main', f.input.main);
    const report = JSON.parse(f.invoke().stdout);
    expect(report.pullRequests[0].status).toBe('retarget-and-reverify');
    expect(report.tasks[0].status).toBe('maintain');
    expect(report.tasks[0].canClose).toBe(false);
    pr.draft = true;
    expect(JSON.parse(f.invoke().stdout).tasks[0].status).toBe('unmanaged-pr');
  } finally {
    f.cleanup();
  }
}, 30_000);

test('a completed follow-up delivery does not repeatedly integrate its historical feature-branch merge', () => {
  const f = fixture();
  try {
    const original = f.input.pullRequests[0]!;
    f.git('switch', '-q', 'main');
    f.git('merge', '--no-ff', '-qm', 'integrate original implementation head', original.head.sha);
    f.input.main = f.git('rev-parse', 'HEAD');
    f.git('update-ref', 'refs/remotes/origin/main', f.input.main);
    const delivery = structuredClone(original);
    delivery.number = 51;
    delivery.base.ref = 'main';
    delivery.head.ref = 'feat/issue-42-integration';
    delivery.merge_commit_sha = f.input.main;
    delivery.html_url = 'https://github.com/ZWkang/nodebraid/pull/51';
    f.input.pullRequests.push(delivery);
    const task = f.input.tasks[0]!;
    task.delivery = 51;
    task.pullRequests.push(51);
    task.issue.state = 'CLOSED';
    task.acceptance[0]!.evidence = 'https://github.com/ZWkang/nodebraid/pull/51#issuecomment-1';
    f.input.specs[0]!.acceptance[0]!.evidence = 'https://github.com/ZWkang/nodebraid/issues/37#issuecomment-4';
    const result = f.invoke();
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.pullRequests[0].status).toBe('needs-integration');
    expect(report.tasks[0].status).toBe('delivered');
    expect(report.tasks[0].delivery).toBe(51);
    expect(report.specs[0].status).toBe('complete');
    expect(report.integration).toEqual([]);
    expect(report.frontier).toEqual([]);
    expect(JSON.parse(f.invoke().stdout)).toEqual(report);
  } finally {
    f.cleanup();
  }
}, 30_000);

test('missing native relationships and stale default-branch evidence fail explicitly', () => {
  const f = fixture();
  try {
    f.input.specs[0]!.children = [[]];
    let result = f.invoke();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('native child');
    f.input.specs[0]!.children = [[{ number: 42 }]];
    f.input.main = f.input.pullRequests[0]!.merge_commit_sha!;
    result = f.invoke();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Fetched default branch');
    f.input.main = f.git('rev-parse', 'refs/remotes/origin/main');
    f.input.pullRequests[0]!.base.repo.full_name = 'other/repository';
    expect(f.invoke().stderr).toContain('another repository');
    f.input.pullRequests[0]!.base.repo.full_name = 'ZWkang/nodebraid';
    f.input.pullRequests[0]!.merge_commit_sha = 'a'.repeat(40);
    expect(f.invoke().status).not.toBe(0);
  } finally {
    f.cleanup();
  }
}, 30_000);

test('approved task frontier respects native blockers, active owners and explicit execution choices', () => {
  const f = fixture();
  try {
    const task = f.input.tasks[0]!;
    task.pullRequests = [];
    task.delivery = null;
    task.acceptance[0]!.evidence = null;
    f.input.specs[0]!.issue.labels = [{ name: 'approved-spec' }];
    const next = structuredClone(task);
    next.issue.number = 43;
    next.blockers = [[{ number: 42 }]];
    f.input.tasks.push(next);
    f.input.specs[0]!.children[0]!.push({ number: 43 });
    f.input.specs[0]!.slices.push({ id: 'follow-up', task: 43 });
    let result = f.invoke();
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).frontier).toEqual([42]);
    task.owner = 'another-active-chat';
    expect(JSON.parse(f.invoke().stdout).frontier).toEqual([]);
    task.owner = null;
    task.issue.assignees = [{ login: 'another-developer' }];
    expect(JSON.parse(f.invoke().stdout).tasks[0].status).toBe('owned-elsewhere');
    task.issue.assignees = [];
    task.execution = 'paused';
    expect(JSON.parse(f.invoke().stdout).tasks[0].status).toBe('paused');
    task.execution = 'agent';
    f.input.specs[0]!.execution = 'local-only';
    expect(JSON.parse(f.invoke().stdout).frontier).toEqual([]);
    f.input.specs[0]!.execution = 'agent';
    task.issue.labels = [];
    result = f.invoke();
    expect(JSON.parse(result.stdout).frontier).toEqual([]);
    expect(JSON.parse(result.stdout).tasks[0].reason).toContain('ready-for-agent');
    task.issue.labels = [{ name: 'approved-spec' }, { name: 'ready-for-agent' }];
    f.input.specs[0]!.approval = null;
    expect(JSON.parse(f.invoke().stdout).frontier).toEqual([]);
    f.input.specs[0]!.approval = task.approval;
    task.approval = 'https://github.com/ZWkang/nodebraid/issues/37#older-approval';
    expect(JSON.parse(f.invoke().stdout).tasks[0].status).toBe('needs-approval');
    task.approval = f.input.specs[0]!.approval;
    task.blockers = [[{ number: 43 }]];
    expect(f.invoke().stderr).toContain('cycle');
    f.input.tasks = [];
    f.input.specs[0]!.children = [[]];
    f.input.specs[0]!.slices = [{ id: 'delivery', task: null }];
    expect(JSON.parse(f.invoke().stdout).specs[0].status).toBe('needs-decomposition');
  } finally {
    f.cleanup();
  }
}, 30_000);
