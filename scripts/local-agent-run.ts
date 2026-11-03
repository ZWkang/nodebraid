import { createHash } from 'node:crypto';
import {
  evaluateFeedback,
  validateReceipt,
  type Decision,
  type FeedbackItem,
  type FeedbackSnapshot,
} from './pr-feedback';
import { planFrontier, type PlanStep } from './discovery-queue';
import { summarizeRisk, type RiskAssessment } from './pr-risk';

export interface RunInput {
  run: string;
  repository: string;
  source: { kind: 'issue' | 'pr'; number: number };
  branch: string;
  baseRefName?: string;
  base: string;
  expectedParent?: string;
  request: string;
  pending: FeedbackItem[];
  plan: PlanStep[];
}
export interface PreparedRun extends RunInput {
  digest: string;
}
export interface ReviewEvidence {
  verdict: 'passed' | 'changes-requested' | 'needs-design';
  head: string;
  tree: string;
  patch: string;
  report: string;
  risk?: RiskAssessment;
}
export interface VerifiedRun {
  taskDigest: string;
  head: string;
  tree: string;
  patch: string;
  checks: { command: string; exitCode: number; log: string; stable: boolean };
  reviews: { standards: ReviewEvidence; spec: ReviewEvidence };
  decisions: Decision[];
  changedFiles?: string[];
}
export interface Publication {
  taskDigest: string;
  head: string;
  tree: string;
  localHead: string;
  parent: string;
}
export interface EvidenceReceipt {
  head: string;
  evidenceCommit: string;
  url: string;
  body: string;
}

function evidenceMismatch(
  receipt: EvidenceReceipt | undefined,
  repository: string,
  pr: number,
  head: string,
): string | undefined {
  if (!receipt) return 'Current-head report publication receipt is missing.';
  if (
    receipt.head !== head ||
    receipt.url !== `https://github.com/${repository}/pull/${pr}` ||
    !/^[a-f0-9]{40}$/.test(receipt.evidenceCommit ?? '') ||
    typeof receipt.body !== 'string' ||
    !receipt.body.includes(`pr-${pr}/${head}/review/report.md`)
  )
    return 'Report publication receipt does not show the full report on the current PR head.';
}

export function artifactDigest(value: unknown): string {
  const canonical = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(canonical);
    if (item !== null && typeof item === 'object')
      return Object.fromEntries(
        Object.entries(item)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, val]) => [key, canonical(val)]),
      );
    return item;
  };
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex');
}

export function prepareRun(input: RunInput): PreparedRun {
  planFrontier(input.plan, []);
  if (
    !input.run?.trim() ||
    !input.request?.trim() ||
    !/^[\w.-]+\/[\w.-]+$/.test(input.repository) ||
    !/^feat\/[\w.-]+$/.test(input.branch) ||
    !/^[a-f0-9]{40}$/.test(input.base) ||
    (input.expectedParent !== undefined &&
      (typeof input.expectedParent !== 'string' || !/^[a-f0-9]{40}$/.test(input.expectedParent))) ||
    !['issue', 'pr'].includes(input.source.kind) ||
    !Number.isSafeInteger(input.source.number) ||
    input.source.number < 1 ||
    new Set(input.pending.map((item) => item.key)).size !== input.pending.length
  )
    throw new Error('Invalid prepared task.');
  const copy: RunInput = structuredClone({
    run: input.run,
    repository: input.repository,
    source: input.source,
    branch: input.branch,
    ...(input.baseRefName === undefined ? {} : { baseRefName: input.baseRefName }),
    base: input.base,
    ...(input.expectedParent === undefined ? {} : { expectedParent: input.expectedParent }),
    request: input.request,
    pending: input.pending,
    plan: input.plan,
  });
  return { ...copy, digest: artifactDigest(copy) };
}

export function validateVerification(task: PreparedRun, verified: VerifiedRun): void {
  if (
    prepareRun(task).digest !== task.digest ||
    verified.taskDigest !== task.digest ||
    !/^[a-f0-9]{40}$/.test(verified.head) ||
    !/^[a-f0-9]{40}$/.test(verified.tree) ||
    !/^[a-f0-9]{64}$/.test(verified.patch) ||
    verified.checks.command !== 'bun run check' ||
    verified.checks.exitCode !== 0 ||
    !verified.checks.stable ||
    !verified.checks.log?.trim()
  )
    throw new Error('Verification does not match the independent prepared task.');
  for (const review of [verified.reviews.standards, verified.reviews.spec]) {
    if (
      review.verdict !== 'passed' ||
      review.head !== verified.head ||
      review.tree !== verified.tree ||
      review.patch !== verified.patch ||
      !review.report?.trim()
    ) {
      throw new Error('Both reviews must pass and identify the exact checked head/tree/patch.');
    }
  }
  summarizeRisk(verified.reviews, verified.changedFiles);
  validateReceipt(
    {
      number: task.source.number,
      run: task.run,
      request: task.request,
      base: task.base,
      commit: verified.head,
      evidence: verified.checks.log,
      decisions: verified.decisions,
    },
    {
      number: task.source.number,
      run: task.run,
      request: task.request,
      base: task.base,
      commit: task.base,
      evidence: '',
      decisions: [],
      pending: task.pending,
    },
  );
}

export function evaluateVerifiedRun(
  task: PreparedRun,
  verified: VerifiedRun,
  publication: Publication,
  pr: FeedbackSnapshot,
  evidence?: EvidenceReceipt,
) {
  validateVerification(task, verified);
  const risk = summarizeRisk(verified.reviews, verified.changedFiles);
  if (
    publication.taskDigest !== task.digest ||
    publication.localHead !== verified.head ||
    publication.tree !== verified.tree ||
    !/^[a-f0-9]{40}$/.test(publication.head)
  ) {
    throw new Error('Publication does not match the verified tree and expected remote parent.');
  }
  if (
    task.branch !== pr.headRefName ||
    task.repository !== pr.headRepository?.nameWithOwner ||
    (task.source.kind === 'pr' && task.source.number !== pr.number)
  )
    throw new Error('Task belongs to another PR.');
  if (!task.baseRefName || !task.expectedParent)
    return {
      status: 'waiting-verification' as const,
      reason: 'Legacy run lacks baseRefName or expectedParent; prepare a new run.',
      risk,
      autoMergeCandidate: false,
    };
  if (publication.parent !== task.expectedParent)
    throw new Error('Publication does not match the independently prepared append parent.');
  // main does not require up-to-date branches; conflicts still surface as CONFLICTING.
  if (
    pr.headRefOid !== publication.head ||
    pr.baseRefName !== task.baseRefName ||
    (task.baseRefName !== 'main' && pr.baseRefOid !== task.base)
  )
    return {
      status: 'waiting-verification' as const,
      reason: 'PR head or base changed; prepare and verify a new run.',
      risk,
      autoMergeCandidate: false,
    };
  if (pr.statusCheckRollup.some((check) => check.headSha !== pr.headRefOid))
    throw new Error('Check head is unverified.');
  const result = evaluateFeedback(pr, task.repository, verified.decisions);
  const missingEvidence =
    result.status === 'ready' ? evidenceMismatch(evidence, task.repository, pr.number, publication.head) : undefined;
  if (missingEvidence)
    return { status: 'waiting-evidence' as const, reason: missingEvidence, risk, autoMergeCandidate: false };
  return { ...result, risk, autoMergeCandidate: result.status === 'ready' && risk.level === 'low' };
}
