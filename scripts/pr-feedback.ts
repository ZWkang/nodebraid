import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseIssueNumber } from './prepare-agent-issue';

interface Check {
  name?: string;
  workflowName?: string;
  status?: string;
  conclusion?: string;
  state?: string;
  detailsUrl?: string;
  targetUrl?: string;
}

export interface FeedbackItem {
  key: string;
  digest: string;
  body: string;
  url: string;
}

interface Thread {
  id: string;
  isResolved: boolean;
  path: string;
  comments: { nodes: { id: string; body: string; updatedAt: string; url: string }[]; pageInfo: PageInfo };
}

export interface FeedbackSnapshot {
  number: number;
  title: string;
  state: string;
  isDraft: boolean;
  headRefName: string;
  headRefOid: string;
  headRepository: { nameWithOwner: string } | null;
  baseRefName: string;
  mergeable: string;
  mergeStateStatus: string;
  reviewDecision: string;
  statusCheckRollup: Check[];
  feedback: FeedbackItem[];
  threads: Thread[];
}

export interface Decision {
  key: string;
  digest: string;
  outcome: 'addressed' | 'not-actionable' | 'needs-design';
  reason: string;
}

export interface Receipt {
  number: number;
  run: number;
  request: string;
  base: string;
  commit: string;
  decisions: Decision[];
  evidence: string;
}

interface Run {
  id: number;
  display_title: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  head_branch: string;
  event: string;
}

interface Comment {
  id: number;
  body: string;
  updated_at: string;
  html_url: string;
  user: { login: string; type: string };
}

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string;
}
const marker = '<!-- nodebraid-feedback:v1\n';
const statusMarker = '<!-- nodebraid-feedback-status:v1 -->';
const worker = 'pr-feedback.lock.yml';
const sha = /^[a-f0-9]{40}$/;

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function isManagedPR(pr: FeedbackSnapshot, repository: string): boolean {
  return (
    pr.state === 'OPEN' &&
    !pr.isDraft &&
    pr.baseRefName === 'main' &&
    pr.headRepository?.nameWithOwner === repository &&
    pr.title.startsWith('[agent] ') &&
    /^feat\/issue-[1-9]\d*$/.test(pr.headRefName)
  );
}

function checkState(check: Check): 'pass' | 'fail' | 'pending' {
  if (check.status && check.status !== 'COMPLETED') return 'pending';
  const state = check.conclusion || check.state;
  if (['SUCCESS', 'NEUTRAL', 'SKIPPED'].includes(state ?? '')) return 'pass';
  if (
    ['FAILURE', 'ERROR', 'TIMED_OUT', 'CANCELLED', 'ACTION_REQUIRED', 'STARTUP_FAILURE', 'STALE'].includes(state ?? '')
  )
    return 'fail';
  return 'pending';
}

function ciPassed(pr: FeedbackSnapshot): boolean {
  return (
    pr.statusCheckRollup.some(
      (check) => check.name === 'checks' && check.workflowName === 'Checks' && check.conclusion === 'SUCCESS',
    ) && pr.statusCheckRollup.every((check) => checkState(check) === 'pass')
  );
}

export function currentDecisions(pr: FeedbackSnapshot, receipts: Receipt[]): Decision[] {
  return receipts.flatMap((receipt) =>
    receipt.decisions.filter(
      (decision) =>
        receipt.commit === pr.headRefOid ||
        !pr.threads.some((thread) => thread.id === decision.key && !thread.isResolved),
    ),
  );
}

export function evaluateFeedback(pr: FeedbackSnapshot, repository: string, decisions: Decision[]) {
  const pending = pr.feedback.filter(
    (item) =>
      !decisions.some(
        (decision) =>
          decision.key === item.key && decision.digest === item.digest && decision.outcome !== 'needs-design',
      ),
  );
  const failed = pr.statusCheckRollup
    .filter((check) => checkState(check) === 'fail')
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  const updateBase = pr.mergeable === 'CONFLICTING' || pr.mergeStateStatus === 'BEHIND';
  const request = digest({
    head: pr.headRefOid,
    feedback: pending.map((item) => [item.key, item.digest]).sort(),
    failed,
    updateBase,
  });
  let status: 'excluded' | 'repair' | 'waiting-ci' | 'waiting-review' | 'ready';
  if (!isManagedPR(pr, repository)) status = 'excluded';
  else if (pending.length || failed.length || updateBase) status = 'repair';
  else if (!ciPassed(pr) || pr.mergeable === 'UNKNOWN') status = 'waiting-ci';
  else if (
    pr.threads.some((thread) => !thread.isResolved) ||
    pr.reviewDecision === 'CHANGES_REQUESTED' ||
    pr.reviewDecision === 'REVIEW_REQUIRED' ||
    pr.mergeStateStatus !== 'CLEAN'
  )
    status = 'waiting-review';
  else status = 'ready';
  return { status, request, pending, failed, updateBase };
}

export function validateReceipt(receipt: Receipt, task: Receipt & { pending: FeedbackItem[] }): void {
  if (
    receipt.number !== task.number ||
    receipt.run !== task.run ||
    receipt.request !== task.request ||
    receipt.base !== task.base ||
    !sha.test(receipt.commit) ||
    !receipt.evidence?.trim() ||
    !Array.isArray(receipt.decisions) ||
    receipt.decisions.length !== task.pending.length
  ) {
    throw new Error('Feedback result must identify the exact prepared request, commit and evidence.');
  }
  const keys = new Set<string>();
  for (const decision of receipt.decisions) {
    if (
      keys.has(decision.key) ||
      !task.pending.some((item) => item.key === decision.key && item.digest === decision.digest) ||
      !['addressed', 'not-actionable', 'needs-design'].includes(decision.outcome) ||
      !decision.reason?.trim()
    ) {
      throw new Error('Every prepared feedback item requires one evidence-backed disposition.');
    }
    keys.add(decision.key);
  }
}

export function parseReceipt(comment: Comment): Receipt | undefined {
  if (comment.user.login !== 'github-actions[bot]' || comment.user.type !== 'Bot' || !comment.body.startsWith(marker))
    return;
  const end = comment.body.indexOf('\n-->');
  if (end < 0) throw new Error('Malformed feedback receipt.');
  return JSON.parse(comment.body.slice(marker.length, end)) as Receipt;
}

async function command(args: string[]): Promise<string> {
  const child = Bun.spawn(args, { stdout: 'pipe', stderr: 'inherit' });
  const output = await new Response(child.stdout).text();
  const code = await child.exited;
  if (code !== 0) throw new Error(`${args[0]} ${args[1]} failed (${code}).`);
  return output.trim();
}

async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const args = ['gh', 'api', path, '--method', method];
  if (body !== undefined) args.push('--input', '-');
  const child = Bun.spawn(args, {
    stdin: body === undefined ? 'ignore' : new Blob([JSON.stringify(body)]),
    stdout: 'pipe',
    stderr: 'inherit',
  });
  const output = await new Response(child.stdout).text();
  if ((await child.exited) !== 0) throw new Error(`GitHub API ${method} ${path} failed.`);
  return output.trim() ? (JSON.parse(output) as T) : (undefined as T);
}

async function pages<T>(path: string, field?: string): Promise<T[]> {
  const result = JSON.parse(await command(['gh', 'api', '--paginate', '--slurp', path])) as (
    T[] | Record<string, T[]>
  )[];
  return result.flatMap((page) => (field ? (page as Record<string, T[]>)[field]! : (page as T[])));
}

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const result = await api<{ data: T; errors?: unknown[] }>('graphql', 'POST', { query, variables });
  if (result.errors) throw new Error(`GraphQL read failed: ${JSON.stringify(result.errors)}`);
  return result.data;
}

async function readThreads(repository: string, number: number): Promise<Thread[]> {
  const [owner, name] = repository.split('/');
  const threads: Thread[] = [];
  const commentFields = 'nodes { id body updatedAt url } pageInfo { hasNextPage endCursor }';
  let cursor: string | null = null;
  do {
    const data: { repository: { pullRequest: { reviewThreads: { nodes: Thread[]; pageInfo: PageInfo } } } } =
      await graphql(
        `
      query($owner:String!,$name:String!,$number:Int!,$cursor:String) {
        repository(owner:$owner,name:$name) { pullRequest(number:$number) {
          reviewThreads(first:100,after:$cursor) { nodes { id isResolved path comments(first:100) { ${commentFields} } } pageInfo { hasNextPage endCursor } }
        } }
      }`,
        { owner, name, number, cursor },
      );
    const page = data.repository.pullRequest.reviewThreads;
    threads.push(...page.nodes);
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  for (const thread of threads) {
    while (thread.comments.pageInfo.hasNextPage) {
      const data = await graphql<{ node: { comments: Thread['comments'] } }>(
        `
        query($id:ID!,$cursor:String) { node(id:$id) { ... on PullRequestReviewThread { comments(first:100,after:$cursor) { ${commentFields} } } } }
      `,
        { id: thread.id, cursor: thread.comments.pageInfo.endCursor },
      );
      thread.comments.nodes.push(...data.node.comments.nodes);
      thread.comments.pageInfo = data.node.comments.pageInfo;
    }
  }
  return threads;
}

async function readSnapshot(
  repository: string,
  number: number,
): Promise<{ pr: FeedbackSnapshot; comments: Comment[] }> {
  const fields =
    'number,title,state,isDraft,headRefName,headRefOid,headRepository,baseRefName,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup';
  const pr = JSON.parse(
    await command(['gh', 'pr', 'view', String(number), '--repo', repository, '--json', fields]),
  ) as FeedbackSnapshot;
  const comments = await pages<Comment>(`repos/${repository}/issues/${number}/comments?per_page=100`);
  const reviews = await pages<{ id: number; body: string; state: string; submitted_at: string; html_url: string }>(
    `repos/${repository}/pulls/${number}/reviews?per_page=100`,
  );
  pr.threads = await readThreads(repository, number);
  pr.feedback = [
    ...comments
      .filter(
        (comment) =>
          !(
            comment.user.login === 'github-actions[bot]' &&
            comment.user.type === 'Bot' &&
            (comment.body.startsWith(marker) || comment.body.startsWith(statusMarker))
          ),
      )
      .map((comment) => ({
        key: `comment:${comment.id}`,
        digest: digest([comment.body, comment.updated_at]),
        body: comment.body,
        url: comment.html_url,
      })),
    ...reviews
      .filter((review) => review.body?.trim() && ['COMMENTED', 'CHANGES_REQUESTED', 'APPROVED'].includes(review.state))
      .map((review) => ({
        key: `review:${review.id}`,
        digest: digest([review.body, review.state, review.submitted_at]),
        body: review.body,
        url: review.html_url,
      })),
    ...pr.threads.map((thread) => ({
      key: thread.id,
      digest: digest(thread.comments.nodes),
      body: JSON.stringify(thread),
      url: thread.comments.nodes[0]!.url,
    })),
  ];
  const current = await api<{ head: { sha: string } }>(`repos/${repository}/pulls/${number}`);
  if (current.head.sha !== pr.headRefOid) throw new Error(`PR #${number} changed during snapshot; superseded.`);
  return { pr, comments };
}

function runTitle(number: number, request: string): string {
  return `PR Feedback #${number} ${request}`;
}

async function onBranch(repository: string, commit: string, head: string): Promise<boolean> {
  if (!sha.test(commit) || !sha.test(head)) throw new Error('Expected complete commit SHAs.');
  if (commit === head) return true;
  const result = await api<{ status: string }>(`repos/${repository}/compare/${commit}...${head}`);
  return result.status === 'ahead' || result.status === 'identical';
}

async function requireCurrentPR(repository: string, pr: FeedbackSnapshot): Promise<void> {
  const current = await api<{
    state: string;
    draft: boolean;
    title: string;
    head: { sha: string; ref: string; repo: { full_name: string } | null };
    base: { ref: string };
  }>(`repos/${repository}/pulls/${pr.number}`);
  if (
    current.head.sha !== pr.headRefOid ||
    !isManagedPR(
      {
        ...pr,
        state: current.state.toUpperCase(),
        isDraft: current.draft,
        title: current.title,
        headRefName: current.head.ref,
        headRepository: current.head.repo ? { nameWithOwner: current.head.repo.full_name } : null,
        baseRefName: current.base.ref,
      },
      repository,
    )
  ) {
    throw new Error(`PR #${pr.number} changed or opted out before a write; superseded.`);
  }
}

async function syncMain(repository: string, pr: FeedbackSnapshot): Promise<'merged' | 'unchanged' | 'conflict'> {
  const token = process.env.AGENT_PR_TOKEN;
  if (!token) throw new Error('AGENT_PR_TOKEN in agent-publish is required to sync main and trigger fresh CI.');
  const main = await api<{ object: { sha: string } }>(`repos/${repository}/git/ref/heads/main`);
  await requireCurrentPR(repository, pr);
  const result = await fetch(`https://api.github.com/repos/${repository}/merges`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      base: pr.headRefName,
      head: main.object.sha,
      commit_message: `Merge main into ${pr.headRefName}`,
    }),
  });
  if (result.status === 201) return 'merged';
  if (result.status === 204) return 'unchanged';
  if (result.status === 409) return 'conflict';
  throw new Error(`Trusted main synchronization failed: HTTP ${result.status}: ${await result.text()}`);
}

async function receiptsOnBranch(
  repository: string,
  pr: FeedbackSnapshot,
  comments: Comment[],
  runs: Run[],
): Promise<Receipt[]> {
  const receipts: Receipt[] = [];
  for (const comment of comments) {
    const receipt = parseReceipt(comment);
    if (!receipt) continue;
    const run = runs.find(
      (run) =>
        run.id === receipt.run &&
        run.conclusion === 'success' &&
        run.head_branch === 'main' &&
        run.event === 'workflow_dispatch' &&
        run.display_title === runTitle(pr.number, receipt.request),
    );
    if (receipt.number === pr.number && run && (await onBranch(repository, receipt.commit, pr.headRefOid)))
      receipts.push(receipt);
  }
  return receipts;
}

async function control(repository: string): Promise<void> {
  const failures: Error[] = [];
  const pulls = await pages<{ number: number }>(`repos/${repository}/pulls?state=open&base=main&per_page=100`);
  const runs = await pages<Run>(
    `repos/${repository}/actions/workflows/${worker}/runs?event=workflow_dispatch&per_page=100`,
    'workflow_runs',
  );
  for (const pull of pulls) {
    let { pr, comments } = await readSnapshot(repository, pull.number);
    if (!isManagedPR(pr, repository)) continue;
    for (const run of runs.filter(
      (run) =>
        run.conclusion === 'success' &&
        run.head_branch === 'main' &&
        run.display_title.startsWith(`PR Feedback #${pr.number} `),
    )) {
      if (comments.some((comment) => parseReceipt(comment)?.run === run.id)) continue;
      const directory = join('.tmp', `feedback-${run.id}`);
      await command([
        'gh',
        'run',
        'download',
        String(run.id),
        '--repo',
        repository,
        '--name',
        'pr-feedback-result',
        '--dir',
        directory,
      ]);
      const result = (await Bun.file(join(directory, 'pr-feedback-result.json')).json()) as Receipt;
      if (
        result.run !== run.id ||
        result.number !== pr.number ||
        run.display_title !== runTitle(pr.number, result.request)
      )
        throw new Error('Feedback artifact does not match its workflow run.');
      if (!(await onBranch(repository, result.commit, pr.headRefOid))) continue;
      await requireCurrentPR(repository, pr);
      const body = `${marker}${JSON.stringify(result)}\n-->\n### Agent 修复结果\n\n提交：${result.commit}\n\n${result.evidence}\n\n${result.decisions.map((decision) => `- ${decision.key}: **${decision.outcome}** — ${decision.reason}`).join('\n')}\n\n[执行记录](${run.html_url})`;
      await api(`repos/${repository}/issues/${pr.number}/comments`, 'POST', { body });
    }
    ({ pr, comments } = await readSnapshot(repository, pr.number));
    const receipts = await receiptsOnBranch(repository, pr, comments, runs);
    const decisions = currentDecisions(pr, receipts);
    if (!isManagedPR(pr, repository)) continue;
    if (ciPassed(pr)) {
      for (const thread of pr.threads.filter((thread) => !thread.isResolved)) {
        const item = pr.feedback.find((item) => item.key === thread.id)!;
        if (
          decisions.some(
            (decision) =>
              decision.key === item.key && decision.digest === item.digest && decision.outcome === 'addressed',
          )
        ) {
          await requireCurrentPR(repository, pr);
          await graphql(
            'mutation($id:ID!) { resolveReviewThread(input:{threadId:$id}) { thread { id isResolved } } }',
            { id: thread.id },
          );
        }
      }
      ({ pr, comments } = await readSnapshot(repository, pr.number));
    }
    const evaluation = evaluateFeedback(pr, repository, decisions);
    if (evaluation.status === 'excluded') continue;
    const previous = runs.find((run) => run.display_title === runTitle(pr.number, evaluation.request));
    let state: string = evaluation.status;
    let link = '';
    if (evaluation.updateBase) {
      const result = await syncMain(repository, pr);
      state = `base-${result}`;
      if (result === 'conflict')
        failures.push(
          new Error(
            `PR #${pr.number}: main has merge conflicts; protected-file validation remains enabled. Resolve the base conflict explicitly before resuming.`,
          ),
        );
    } else if (evaluation.status === 'repair') {
      if (!previous) {
        await requireCurrentPR(repository, pr);
        await api(`repos/${repository}/actions/workflows/${worker}/dispatches`, 'POST', {
          ref: 'main',
          inputs: { pr_number: String(pr.number), expected_head: pr.headRefOid, request_id: evaluation.request },
        });
        state = 'repair-dispatched';
      } else {
        link = `\n\n[修复运行](${previous.html_url})`;
        state =
          previous.status !== 'completed'
            ? 'repair-running'
            : previous.conclusion === 'success'
              ? 'needs-attention'
              : `repair-${previous.conclusion}`;
      }
    }
    const labels: Record<string, string> = {
      ready: '当前提交的 CI 和反馈已处理，可由你最终审阅和合并。',
      'waiting-ci': '等待当前提交的 Checks 和 GitHub 合并状态。',
      'waiting-review': '验证已完成；仍需审阅者批准、确认争议反馈或解除 GitHub 合并门禁。',
      'repair-dispatched': '已派发当前提交的 CI / review 修复。',
      'repair-running': 'Agent 正在处理当前提交的反馈。',
      'needs-attention': 'Agent 本轮已结束，仍有未解决问题或设计决策；请查看执行结果。',
      'base-merged': '已由可信发布阶段合入 main；等待新 head 的 CI 和反馈重新验收。',
      'base-unchanged': 'main 已在分支中；等待 GitHub 刷新合并状态。',
      'base-conflict': '与 main 存在合并冲突，自动同步失败。保留保护文件校验，需先明确解决该冲突。',
    };
    const body = `${statusMarker}\n### PR 自动维护\n\nHead: ${pr.headRefOid}\n\n${labels[state] ?? `修复运行失败（${state}），请查看原始错误。新反馈、提交或在 Actions 重跑失败运行可重新调查。`}\n\nGitHub: ${pr.mergeable} / ${pr.mergeStateStatus}; review: ${pr.reviewDecision || 'NONE'}${link}`;
    const statusComment = comments.find(
      (comment) =>
        comment.user.login === 'github-actions[bot]' &&
        comment.user.type === 'Bot' &&
        comment.body.startsWith(statusMarker),
    );
    if (statusComment?.body !== body && !state.startsWith('base-')) await requireCurrentPR(repository, pr);
    if (statusComment?.body !== body)
      await api(
        statusComment
          ? `repos/${repository}/issues/comments/${statusComment.id}`
          : `repos/${repository}/issues/${pr.number}/comments`,
        statusComment ? 'PATCH' : 'POST',
        { body },
      );
  }
  if (failures.length) throw new AggregateError(failures, 'Trusted base synchronization requires attention.');
}

function trustedDirectory(): string {
  if (!process.env.RUNNER_TEMP) throw new Error('RUNNER_TEMP is required.');
  return join(process.env.RUNNER_TEMP, 'gh-aw', 'nodebraid-feedback');
}

async function prepare(repository: string): Promise<void> {
  const number = parseIssueNumber(process.env.PR_NUMBER);
  const { pr, comments } = await readSnapshot(repository, number);
  if (!isManagedPR(pr, repository)) throw new Error('PR is not an open, same-repository managed issue PR.');
  const runs = await pages<Run>(
    `repos/${repository}/actions/workflows/${worker}/runs?event=workflow_dispatch&per_page=100`,
    'workflow_runs',
  );
  const receipts = await receiptsOnBranch(repository, pr, comments, runs);
  const evaluation = evaluateFeedback(pr, repository, currentDecisions(pr, receipts));
  if (
    pr.headRefOid !== process.env.EXPECTED_HEAD ||
    evaluation.request !== process.env.REQUEST_ID ||
    evaluation.status !== 'repair'
  )
    throw new Error('Feedback request was superseded; controller must re-evaluate the current PR.');
  await command([
    'git',
    'fetch',
    '--no-tags',
    'origin',
    `+refs/pull/${number}/head:refs/remotes/origin/feedback-${number}`,
    '+refs/heads/main:refs/remotes/origin/main',
  ]);
  if ((await command(['git', 'rev-parse', `refs/remotes/origin/feedback-${number}`])) !== pr.headRefOid)
    throw new Error('PR changed before checkout.');
  await command(['git', 'checkout', '-B', pr.headRefName, `refs/remotes/origin/feedback-${number}`]);
  const task = {
    number,
    run: parseIssueNumber(process.env.GITHUB_RUN_ID),
    request: evaluation.request,
    base: pr.headRefOid,
    commit: pr.headRefOid,
    pending: evaluation.pending,
    decisions: [],
    evidence: '',
    pr,
    evaluation,
  };
  await mkdir('.tmp', { recursive: true });
  await Bun.write(join(trustedDirectory(), 'task.json'), JSON.stringify(task, null, 2));
  await Bun.write('.tmp/agent-pr-feedback.json', JSON.stringify(task, null, 2));
  await Bun.write(
    '.tmp/pr-feedback-result.json',
    JSON.stringify({ ...task, pr: undefined, evaluation: undefined, pending: undefined }, null, 2),
  );
}

async function verify(): Promise<void> {
  const task = (await Bun.file(join(trustedDirectory(), 'task.json')).json()) as Receipt & { pending: FeedbackItem[] };
  const receipt = (await Bun.file('.tmp/pr-feedback-result.json').json()) as Receipt;
  validateReceipt(receipt, task);
  if (receipt.commit !== (await command(['git', 'rev-parse', 'HEAD'])))
    throw new Error('Receipt must identify the actual locally committed result.');
  await command(['git', 'merge-base', '--is-ancestor', task.base, receipt.commit]);
  if (await command(['git', 'status', '--porcelain']))
    throw new Error('Feedback changes must be committed before publication.');
}

if (import.meta.main) {
  const mode = process.argv[2];
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository))
    throw new Error('GITHUB_REPOSITORY must identify owner/repository.');
  if (mode === 'control') await control(repository);
  else if (mode === 'prepare') await prepare(repository);
  else if (mode === 'verify') await verify();
  else throw new Error('Usage: bun scripts/pr-feedback.ts control|prepare|verify');
}
