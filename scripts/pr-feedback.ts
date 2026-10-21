import { createHash } from 'node:crypto';

interface Check {
  headSha?: string;
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

export function incomingFeedback(
  items: FeedbackItem[],
  published: Pick<FeedbackItem, 'key' | 'digest'>[],
): FeedbackItem[] {
  return items.filter((item) => !published.some((own) => own.key === item.key && own.digest === item.digest));
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
  run: string;
  request: string;
  base: string;
  commit: string;
  decisions: Decision[];
  evidence: string;
}

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string;
}
const sha = /^[a-f0-9]{40}$/;

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function isManagedPR(
  pr: Pick<FeedbackSnapshot, 'state' | 'isDraft' | 'headRepository' | 'title' | 'headRefName'>,
  repository: string,
): boolean {
  return (
    pr.state === 'OPEN' &&
    !pr.isDraft &&
    pr.headRepository?.nameWithOwner === repository &&
    (pr.title.startsWith('[local-agent] ') || pr.title.startsWith('[agent] ')) &&
    /^feat\/issue-[1-9]\d*(?:-integration)?$/.test(pr.headRefName)
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
  return receipts
    .filter((receipt) => receipt.number === pr.number && receipt.commit === pr.headRefOid)
    .flatMap((receipt) => receipt.decisions);
}

export function evaluateFeedback(pr: FeedbackSnapshot, repository: string, decisions: Decision[]) {
  if (pr.threads.some((thread) => thread.comments.pageInfo.hasNextPage))
    throw new Error('Incomplete thread pagination.');
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
    base: pr.baseRefName,
    feedback: pending.map((item) => [item.key, item.digest]).sort(),
    failed,
    updateBase,
  });
  let status: 'excluded' | 'repair' | 'waiting-ci' | 'waiting-review' | 'needs-integration' | 'ready';
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
  else status = pr.baseRefName === 'main' ? 'ready' : 'needs-integration';
  return { status, request, pending, failed, updateBase };
}

export function validateReceipt(receipt: Receipt, task: Receipt & { pending: FeedbackItem[] }): void {
  if (
    typeof receipt.run !== 'string' ||
    !receipt.run ||
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
