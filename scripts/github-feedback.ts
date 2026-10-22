import { createHash } from 'node:crypto';
import { incomingFeedback, type FeedbackItem, type FeedbackSnapshot } from './pr-feedback';

interface Comment {
  id: number;
  body: string;
  updated_at: string;
  html_url: string;
}
interface Review {
  id: number;
  body: string;
  state: string;
  submitted_at: string | null;
  html_url: string;
  user: { login: string };
}
interface Page<T> {
  nodes: T[];
  pageInfo: { hasNextPage: boolean; endCursor: string };
}
interface Workflow {
  id: number;
  name: string;
  path: string;
  head_sha: string;
  status: string;
  conclusion: string | null;
}
interface Check {
  name: string;
  head_sha: string;
  status: string;
  conclusion: string | null;
  html_url: string;
}
export interface GitHubFeedback {
  pr: {
    number: number;
    title: string;
    state: string;
    draft: boolean;
    head: { sha: string; ref: string; repo: { full_name: string } | null };
    base: { ref: string; sha: string };
    mergeable: boolean | null;
    mergeable_state: string;
  };
  comments: Comment[][];
  reviews: Review[][];
  threads: Page<FeedbackSnapshot['threads'][number]>[];
  checks: { total_count: number; check_runs: Check[] };
  statuses: { sha: string; total_count: number; statuses: { context: string; state: string; target_url: string }[] };
  workflows: { total_count: number; workflow_runs: Workflow[] };
}

export function restPages<T>(pages: T[][]): T[] {
  if (
    !pages.length ||
    pages.some((page, index) => (index === pages.length - 1 ? page.length >= 100 : page.length !== 100))
  ) {
    throw new Error('Incomplete REST pagination; fetch through the final page with fewer than 100 items.');
  }
  return pages.flat();
}

export function normalizeFeedback(
  raw: GitHubFeedback,
  published: Pick<FeedbackItem, 'key' | 'digest'>[],
): FeedbackSnapshot {
  const pr = raw.pr,
    comments = restPages(raw.comments),
    reviews = restPages(raw.reviews);
  if (typeof pr.base.sha !== 'string' || !/^[a-f0-9]{40}$/.test(pr.base.sha))
    throw new Error('PR target base SHA is unverified.');
  if (
    !raw.threads.length ||
    raw.threads.some((page, index) => page.pageInfo.hasNextPage !== index < raw.threads.length - 1)
  )
    throw new Error('Incomplete review-thread pagination.');
  const threads = structuredClone(raw.threads.flatMap((page) => page.nodes));
  if (threads.some((thread) => thread.comments.pageInfo.hasNextPage))
    throw new Error('Incomplete thread comment pagination.');
  if (
    raw.checks.total_count !== raw.checks.check_runs.length ||
    raw.statuses.total_count !== raw.statuses.statuses.length ||
    raw.workflows.total_count !== raw.workflows.workflow_runs.length
  )
    throw new Error('Incomplete CI pagination.');
  if (raw.statuses.sha !== pr.head.sha) throw new Error('Commit status belongs to another head.');
  if (
    raw.checks.check_runs.some((check) => check.head_sha !== pr.head.sha) ||
    raw.workflows.workflow_runs.some((run) => run.head_sha !== pr.head.sha)
  )
    throw new Error('CI belongs to another head.');
  const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const submitted = reviews.filter((review) => review.state !== 'PENDING');
  if (submitted.some((review) => !review.submitted_at))
    throw new Error('Submitted review has no submission timestamp.');
  const latest = new Map<string, Review>();
  for (const review of [...submitted].sort((a, b) => a.submitted_at!.localeCompare(b.submitted_at!) || a.id - b.id)) {
    if (['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)) latest.set(review.user.login, review);
  }
  const feedback = incomingFeedback(
    [
      ...comments.map((comment) => ({
        key: `comment:${comment.id}`,
        digest: digest([comment.body, comment.updated_at]),
        body: comment.body,
        url: comment.html_url,
      })),
      ...submitted
        .filter((review) => ['COMMENTED', 'CHANGES_REQUESTED', 'APPROVED'].includes(review.state))
        .map((review) => ({
          key: `review:${review.id}`,
          digest: digest([review.body, review.state, review.submitted_at]),
          body: review.body,
          url: review.html_url,
        })),
      ...threads.map((thread) => ({
        key: thread.id,
        digest: digest(thread.comments.nodes),
        body: JSON.stringify(thread),
        url: thread.comments.nodes[0]?.url ?? '',
      })),
    ],
    published,
  );
  return {
    number: pr.number,
    title: pr.title,
    state: pr.state.toUpperCase(),
    isDraft: pr.draft,
    headRefName: pr.head.ref,
    headRefOid: pr.head.sha,
    headRepository: pr.head.repo ? { nameWithOwner: pr.head.repo.full_name } : null,
    baseRefName: pr.base.ref,
    baseRefOid: pr.base.sha,
    mergeable: pr.mergeable === null ? 'UNKNOWN' : pr.mergeable ? 'MERGEABLE' : 'CONFLICTING',
    mergeStateStatus: pr.mergeable_state.toUpperCase(),
    reviewDecision: [...latest.values()].some((review) => review.state === 'CHANGES_REQUESTED')
      ? 'CHANGES_REQUESTED'
      : '',
    feedback,
    threads,
    statusCheckRollup: [
      ...raw.checks.check_runs.map((check) => {
        const run = raw.workflows.workflow_runs.find((run) => check.html_url.includes(`/actions/runs/${run.id}/`));
        return {
          name: check.name,
          headSha: check.head_sha,
          workflowName: run?.path === '.github/workflows/test.yml' ? run.name : '',
          status: check.status.toUpperCase(),
          conclusion: check.conclusion?.toUpperCase(),
          detailsUrl: check.html_url,
        };
      }),
      ...raw.workflows.workflow_runs.map((run) => ({
        name: `workflow:${run.name}`,
        headSha: run.head_sha,
        status: run.status.toUpperCase(),
        conclusion: run.conclusion?.toUpperCase(),
      })),
      ...raw.statuses.statuses.map((status) => ({
        name: status.context,
        headSha: pr.head.sha,
        state: status.state.toUpperCase(),
        targetUrl: status.target_url,
      })),
    ],
  };
}
