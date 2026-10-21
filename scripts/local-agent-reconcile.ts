import { execFileSync, spawnSync } from 'node:child_process';
import { restPages, type GitHubFeedback } from './github-feedback';
import { validateAgentIssue, type AgentIssue } from './prepare-agent-issue';
import { planFrontier } from './discovery-queue';
import { isManagedPR } from './pr-feedback';

interface Acceptance {
  id: string;
  // The caller verifies the linked execution evidence; this command does not authenticate its contents.
  evidence: string | null;
}
interface WorkItem {
  issue: AgentIssue & { assignees: { login: string }[] };
  approval: string | null;
  execution: 'agent' | 'local-only' | 'paused';
  owner: string | null;
  acceptance: Acceptance[];
}
interface Task extends WorkItem {
  parent: number | null;
  blockers: { number: number }[][];
  pullRequests: number[];
  delivery: number | null;
}
interface Spec extends WorkItem {
  children: { number: number }[][];
  slices: { id: string; task: number | null }[];
}
type PullRequest = Pick<GitHubFeedback['pr'], 'number' | 'state' | 'head' | 'title' | 'draft'> & {
  base: { ref: string; repo: { full_name: string } };
  merged: boolean;
  merge_commit_sha: string | null;
  html_url: string;
};
export interface ReconciliationInput {
  repository: { full_name: string; default_branch: string };
  main: string;
  actor: string;
  executor: string;
  closeAuthorization: string;
  specs: Spec[];
  tasks: Task[];
  pullRequests: PullRequest[];
}

export function reconcileDelivery(input: ReconciliationInput) {
  for (const { issue } of [...input.tasks, ...input.specs]) {
    if (!['OPEN', 'CLOSED'].includes(issue.state))
      throw new Error(`Issue #${issue.number} requires normalized OPEN or CLOSED state.`);
  }
  for (const pr of input.pullRequests) {
    if (
      typeof pr.merged !== 'boolean' ||
      typeof pr.draft !== 'boolean' ||
      typeof pr.state !== 'string' ||
      !['OPEN', 'CLOSED'].includes(pr.state.toUpperCase()) ||
      (pr.merged && pr.state.toUpperCase() !== 'CLOSED')
    )
      throw new Error(
        `PR #${pr.number} requires complete PR metadata: boolean merged/draft and open/closed state; merged PRs must be closed.`,
      );
  }
  const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const defaultBranch = input.repository.default_branch;
  const main = git('rev-parse', '--verify', `refs/remotes/origin/${defaultBranch}^{commit}`);
  if (main !== input.main) throw new Error('Fetched default branch differs from the reconciliation source.');
  if (input.pullRequests.some((pr) => pr.base.repo.full_name !== input.repository.full_name))
    throw new Error('PR delivery belongs to another repository.');
  const taskNumbers = new Set(input.tasks.map((task) => task.issue.number));
  const specNumbers = new Set(input.specs.map((spec) => spec.issue.number));
  if (
    taskNumbers.size !== input.tasks.length ||
    specNumbers.size !== input.specs.length ||
    new Set(input.pullRequests.map((pr) => pr.number)).size !== input.pullRequests.length
  )
    throw new Error('Duplicate reconciliation identities.');
  for (const spec of input.specs) {
    const children = restPages(spec.children).map(({ number }) => number);
    const expected = [
      ...spec.slices.flatMap((slice) => (slice.task === null ? [] : [slice.task])),
      ...input.tasks.filter((task) => task.parent === spec.issue.number).map((task) => task.issue.number),
    ];
    if (
      expected.some((number) => !children.includes(number)) ||
      children.some(
        (number) => !input.tasks.some((task) => task.issue.number === number && task.parent === spec.issue.number),
      )
    )
      throw new Error(`Missing or inconsistent native child relationship for spec #${spec.issue.number}.`);
  }
  for (const task of input.tasks) {
    if (task.parent !== null && !specNumbers.has(task.parent)) throw new Error(`Missing parent spec #${task.parent}.`);
    if (restPages(task.blockers).some(({ number }) => !taskNumbers.has(number)))
      throw new Error(`Missing blocker for issue #${task.issue.number}.`);
  }
  const integrated = (commit: string | null) => {
    if (!commit || !/^[a-f0-9]{40}$/.test(commit)) throw new Error('Merged PR requires its actual merge commit.');
    git('rev-parse', '--verify', `${commit}^{commit}`);
    const result = spawnSync('git', ['merge-base', '--is-ancestor', commit, main], { encoding: 'utf8' });
    if (result.error) throw result.error;
    if (result.status !== 0 && result.status !== 1) throw new Error(`Git integration check failed: ${result.stderr}`);
    return result.status === 0;
  };
  const pullRequests = input.pullRequests.map((pr) => ({
    number: pr.number,
    url: pr.html_url,
    commit: pr.merge_commit_sha,
    status: pr.merged
      ? integrated(pr.merge_commit_sha)
        ? 'integrated'
        : 'needs-integration'
      : pr.state.toUpperCase() !== 'OPEN'
        ? 'closed-unmerged'
        : isManagedPR(
              {
                state: 'OPEN',
                isDraft: pr.draft,
                title: pr.title,
                headRefName: pr.head.ref,
                headRepository: pr.head.repo ? { nameWithOwner: pr.head.repo.full_name } : null,
              },
              input.repository.full_name,
            )
          ? 'maintain'
          : 'unmanaged',
  }));
  for (const result of pullRequests) {
    const pr = input.pullRequests.find((item) => item.number === result.number)!;
    if (
      result.status === 'maintain' &&
      pr.base.ref !== defaultBranch &&
      input.pullRequests.some(
        (upstream) =>
          upstream.head.ref === pr.base.ref &&
          upstream.head.repo?.full_name === input.repository.full_name &&
          pullRequests.find((item) => item.number === upstream.number)!.status === 'integrated',
      )
    )
      result.status = 'retarget-and-reverify';
  }
  const missingAcceptance = (item: WorkItem) => {
    if (!item.acceptance.length) throw new Error(`Issue #${item.issue.number} has no acceptance criteria.`);
    return item.acceptance.filter((criterion) => !criterion.evidence?.trim()).map((criterion) => criterion.id);
  };
  const held = (item: WorkItem): string | null => {
    if (!['agent', 'local-only', 'paused'].includes(item.execution))
      throw new Error(`Issue #${item.issue.number} has no explicit execution choice.`);
    if (item.execution !== 'agent') return item.execution;
    const unresolved = item.issue.labels.find(({ name }) => name === 'needs-info' || name === 'needs-design');
    if (unresolved) return unresolved.name;
    if (
      (item.owner !== null && item.owner !== input.executor) ||
      item.issue.assignees.some(({ login }) => login !== input.actor)
    )
      return 'owned-elsewhere';
    if (!item.approval?.trim() && !item.issue.labels.some(({ name }) => name === 'bug')) return 'needs-approval';
    return null;
  };
  const tasks = input.tasks.map((task) => {
    const prs = task.pullRequests.map((number) => {
      const pr = pullRequests.find((candidate) => candidate.number === number);
      if (!pr) throw new Error(`Missing PR #${number} for issue #${task.issue.number}.`);
      return pr;
    });
    if (task.delivery !== null && !task.pullRequests.includes(task.delivery))
      throw new Error(`Delivery PR must be linked to issue #${task.issue.number}.`);
    const delivery = prs.find((pr) => pr.number === task.delivery);
    const missing = missingAcceptance(task);
    const parent = input.specs.find((spec) => spec.issue.number === task.parent);
    const hold =
      held(task) ??
      (parent
        ? (held(parent) ?? (!parent.approval || task.approval !== parent.approval ? 'needs-approval' : null))
        : null);
    const delivered =
      delivery?.status === 'integrated' &&
      !missing.length &&
      (!parent || (!!parent.approval && task.approval === parent.approval)) &&
      !task.issue.labels.some(({ name }) => name === 'needs-info' || name === 'needs-design') &&
      !prs.some((pr) => ['maintain', 'retarget-and-reverify', 'unmanaged'].includes(pr.status));
    let reason: string | null = null;
    let status =
      task.issue.state === 'CLOSED' && delivered
        ? 'delivered'
        : (hold ??
          (prs.some((pr) => pr.status === 'unmanaged')
            ? 'unmanaged-pr'
            : prs.some((pr) => pr.status === 'maintain' || pr.status === 'retarget-and-reverify')
              ? 'maintain'
              : delivery?.status === 'integrated'
                ? missing.length
                  ? 'needs-acceptance'
                  : 'delivered'
                : delivery?.status === 'needs-integration'
                  ? 'needs-integration'
                  : 'pending'));
    if (status === 'pending') {
      try {
        validateAgentIssue(task.issue, task.issue.number);
      } catch (error) {
        status = 'ineligible';
        reason = String(error);
      }
    }
    return {
      number: task.issue.number,
      delivery: task.delivery,
      status,
      delivered,
      reason,
      blockedBy: restPages(task.blockers).map(({ number }) => number),
      missingAcceptance: missing,
      pullRequests: prs,
      canClose: task.issue.state === 'OPEN' && status === 'delivered' && !!input.closeAuthorization.trim(),
    };
  });
  const completed = input.tasks
    .filter(
      (task) => task.issue.state === 'CLOSED' && tasks.find((result) => result.number === task.issue.number)!.delivered,
    )
    .map((task) => String(task.issue.number));
  const available = input.tasks.length
    ? planFrontier(
        input.tasks.map((task) => ({
          id: String(task.issue.number),
          blockedBy: restPages(task.blockers).map(({ number }) => String(number)),
          acceptance: task.acceptance.map((criterion) => criterion.id).join(', '),
        })),
        completed,
      )
    : [];
  for (const task of tasks) {
    if (task.status === 'pending') task.status = available.includes(String(task.number)) ? 'ready' : 'blocked';
    if (!available.includes(String(task.number))) task.canClose = false;
  }
  const specs = input.specs.map((spec) => {
    const children = restPages(spec.children).map(({ number }) => number);
    const missing = missingAcceptance(spec);
    const unfinished = children.filter((number) => {
      const task = tasks.find((item) => item.number === number);
      const source = input.tasks.find((item) => item.issue.number === number);
      if (!task || !source) throw new Error(`Missing native child #${number}.`);
      return source.issue.state !== 'CLOSED' || !task.delivered;
    });
    const status =
      held(spec) ??
      (!children.length || !spec.slices.length || spec.slices.some((slice) => slice.task === null)
        ? 'needs-decomposition'
        : unfinished.length
          ? 'waiting-children'
          : missing.length
            ? 'needs-acceptance'
            : !input.closeAuthorization.trim()
              ? 'waiting-authorization'
              : 'complete');
    return {
      number: spec.issue.number,
      title: 'spec: ' + spec.issue.title.replace(/^spec:\s*/i, ''),
      missingSlices: spec.slices.filter((slice) => slice.task === null).map((slice) => slice.id),
      status,
      unfinished,
      missingAcceptance: missing,
      canClose: spec.issue.state === 'OPEN' && status === 'complete',
    };
  });
  return {
    main,
    defaultBranch,
    pullRequests,
    tasks,
    specs,
    integration: tasks
      .filter((task) => task.status === 'needs-integration')
      .map((task) => ({ issue: task.number, pullRequest: task.delivery })),
    frontier: tasks.filter((task) => task.status === 'ready').map((task) => task.number),
  };
}
