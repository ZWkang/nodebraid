import { createHash } from 'node:crypto';
import { closeSync, constants, lstatSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { validateVerification, type PreparedRun, type Publication, type VerifiedRun } from './local-agent-run';

export interface ReportArtifact {
  path: string;
  kind: 'report' | 'log';
  sha256: string;
}

export interface BehaviorEvidence {
  id: string;
  acceptance: string;
  command: string;
  exitCode: number | null;
  log?: string;
  phase: 'red' | 'green' | 'check';
  expectedExitCode?: number;
  status: 'passed' | 'failed' | 'not-run';
}

export interface VerificationReportContent {
  schemaVersion: 1;
  source: { base: string; head: string; tree: string; patch: string; localHead: string };
  task: Pick<PreparedRun, 'run' | 'repository' | 'source' | 'request' | 'plan'>;
  checks: VerifiedRun['checks'];
  reviews: VerifiedRun['reviews'];
  decisions: VerifiedRun['decisions'];
  behaviorEvidence: BehaviorEvidence[] | null;
}

export interface CollectedVerificationReport extends VerificationReportContent {
  artifacts: ReportArtifact[];
  markdown: string;
  files: { path: string; content: Buffer; kind: ReportArtifact['kind'] }[];
}

export function renderVerificationReport(report: VerificationReportContent): string {
  const { source, task, checks, reviews } = report;
  return [
    '# Verification report',
    '',
    `Run: ${task.run} · ${task.repository} · ${task.source.kind} #${task.source.number}`,
    '',
    '## Reviewed and published source',
    '',
    `- Base: \`${source.base}\``,
    `- Published head: \`${source.head}\``,
    `- Reviewed local head: \`${source.localHead}\``,
    `- Tree: \`${source.tree}\``,
    `- Complete binary patch SHA-256: \`${source.patch}\``,
    '',
    'The publication record matches the reviewed tree and expected parent. Remote PR freshness is checked separately by the publisher.',
    '',
    '## Acceptance plan',
    '',
    task.request,
    '',
    ...task.plan.flatMap((step) => [
      `### ${step.id}`,
      '',
      step.acceptance,
      '',
      `Dependencies: ${step.blockedBy.length ? step.blockedBy.join(', ') : 'none'}`,
      '',
    ]),
    '## Full engineering check',
    '',
    `\`${checks.command}\` — exit ${checks.exitCode}; checked source remained unchanged.`,
    '',
    `[Original command output](${checks.log})`,
    '',
    '## Standards review',
    '',
    `Verdict: ${reviews.standards.verdict}. [Original report](reviews/standards.md)`,
    '',
    reviews.standards.report,
    '',
    '## Spec review',
    '',
    `Verdict: ${reviews.spec.verdict}. [Original report](reviews/spec.md)`,
    '',
    reviews.spec.report,
    '',
    '## Behavior evidence',
    '',
    ...(report.behaviorEvidence === null
      ? [
          'Behavior evidence: not provided. The full engineering check does not establish regression red/green coverage.',
        ]
      : report.behaviorEvidence.length === 0
        ? ['Behavior evidence: no checks declared. No regression red/green coverage is claimed.']
        : report.behaviorEvidence.flatMap((item) => [
            `### ${item.id}`,
            '',
            `${item.phase} — ${item.status}; ${item.exitCode === null ? 'not executed' : `exit ${item.exitCode}`}; expected exit ${item.expectedExitCode ?? 0}.`,
            '',
            item.acceptance,
            '',
            `Command: \`${item.command}\``,
            '',
            ...(item.log ? [`[Original command output](${item.log})`, ''] : []),
          ])),
    '',
    '## Feedback dispositions',
    '',
    ...(report.decisions.length
      ? report.decisions.flatMap((decision) => [`- ${decision.key}: ${decision.outcome} — ${decision.reason}`])
      : ['No feedback dispositions were included in this run.']),
    '',
    '## Scope and limitations',
    '',
    'The two original review reports above retain their scope, evidence and untested areas. Their separate fields do not authenticate reviewer identity or prove independence.',
    '',
    'Only explicitly recorded commands and reports are included. Missing behavior evidence, browser coverage or platform checks are not inferred to have passed.',
    '',
    'A red result records the supplied behavior explanation and expected nonzero exit. The original output must still be reviewed to distinguish a behavior assertion from a compile, setup or infrastructure failure.',
    '',
  ].join('\n');
}

export function collectVerificationReport(runDirectory: string): CollectedVerificationReport {
  const directory = resolve(runDirectory);
  const readFile = (name: string) => readRunFile(directory, name);
  const read = <T>(name: string): T => JSON.parse(readFile(name).toString('utf8')) as T;
  const task = read<PreparedRun>('prepared-task.json');
  const verified = read<VerifiedRun>('verification.json');
  const publication = read<Publication>('publication.json');
  validateVerification(task, verified);
  if (
    publication.taskDigest !== task.digest ||
    publication.localHead !== verified.head ||
    publication.tree !== verified.tree ||
    publication.parent !== task.base ||
    !/^[a-f0-9]{40}$/.test(publication.head)
  )
    throw new Error('Publication does not match the verified source.');

  const files: CollectedVerificationReport['files'] = [
    { path: 'logs/full-check.log', kind: 'log', content: readFile(verified.checks.log) },
    { path: 'reviews/standards.md', kind: 'report', content: Buffer.from(verified.reviews.standards.report) },
    { path: 'reviews/spec.md', kind: 'report', content: Buffer.from(verified.reviews.spec.report) },
  ];
  let behaviorEvidence: BehaviorEvidence[] | null = null;
  if (lstatSync(join(directory, 'behavior-evidence.json'), { throwIfNoEntry: false })) {
    const entries = read<BehaviorEvidence[]>('behavior-evidence.json');
    if (!Array.isArray(entries)) throw new Error('Behavior evidence must be an array.');
    const ids = new Set<string>();
    behaviorEvidence = entries.map((item, index) => {
      validateBehaviorEvidence(item);
      if (ids.has(item.id)) throw new Error(`Duplicate behavior evidence ID: ${item.id}`);
      ids.add(item.id);
      const { id, acceptance, command, exitCode, phase, expectedExitCode, status } = item;
      const result: BehaviorEvidence = { id, acceptance, command, exitCode, phase, status };
      if (expectedExitCode !== undefined) result.expectedExitCode = expectedExitCode;
      if (item.log) {
        result.log = `logs/behavior-${index + 1}.log`;
        files.push({ path: result.log, kind: 'log', content: readFile(item.log) });
      }
      return result;
    });
  }
  const report: VerificationReportContent = {
    schemaVersion: 1,
    source: {
      base: task.base,
      head: publication.head,
      tree: verified.tree,
      patch: verified.patch,
      localHead: verified.head,
    },
    task: { run: task.run, repository: task.repository, source: task.source, request: task.request, plan: task.plan },
    checks: { ...verified.checks, log: 'logs/full-check.log' },
    reviews: verified.reviews,
    decisions: verified.decisions,
    behaviorEvidence,
  };
  const markdown = renderVerificationReport(report);
  files.push({ path: 'report.md', kind: 'report', content: Buffer.from(markdown) });
  const artifacts = files.map(({ path, kind, content }) => ({
    path,
    kind,
    sha256: createHash('sha256').update(content).digest('hex'),
  }));
  return { ...report, artifacts, markdown, files };
}

function inspectPath(directory: string, filename: string, allowMissing: boolean): string {
  const path = resolve(directory, filename);
  const within = relative(directory, path);
  if (!within || within === '..' || within.startsWith(`..${sep}`) || isAbsolute(within))
    throw new Error(`Evidence path is outside its directory: ${filename}`);
  const parts = [directory, ...within.split(sep)];
  let current = '';
  for (const [index, part] of parts.entries()) {
    current = current ? join(current, part) : part;
    const stat = lstatSync(current, { throwIfNoEntry: false });
    if (!stat) {
      if (allowMissing) break;
      throw new Error(`Evidence file is missing: ${filename}`);
    }
    if (stat.isSymbolicLink()) throw new Error(`Evidence path contains a symlink: ${filename}`);
    if (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory())
      throw new Error(`Evidence path is not a regular file or directory: ${filename}`);
  }
  return path;
}

function readRunFile(directory: string, filename: string): Buffer {
  const path = inspectPath(directory, filename, false);
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    return readFileSync(fd);
  } finally {
    closeSync(fd);
  }
}

function writeReportFile(path: string, content: string | Buffer): void {
  const fd = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW);
  try {
    writeFileSync(fd, content);
  } finally {
    closeSync(fd);
  }
}

function validateBehaviorEvidence(item: BehaviorEvidence): void {
  if (
    !item ||
    ![item.id, item.acceptance, item.command].every((value) => typeof value === 'string' && value.trim()) ||
    !['red', 'green', 'check'].includes(item.phase) ||
    !['passed', 'failed', 'not-run'].includes(item.status) ||
    (item.expectedExitCode !== undefined && (!Number.isSafeInteger(item.expectedExitCode) || item.expectedExitCode < 0))
  )
    throw new Error('Behavior evidence requires an ID, behavior explanation, command, phase and outcome.');
  if (item.status === 'not-run') {
    if (item.exitCode !== null || item.log !== undefined)
      throw new Error(`Not-run behavior evidence cannot claim an exit or log: ${item.id}`);
    return;
  }
  if (!Number.isSafeInteger(item.exitCode) || item.exitCode === null || item.exitCode < 0 || !item.log?.trim())
    throw new Error(`Executed behavior evidence requires an exit code and original log: ${item.id}`);
  if (item.phase === 'red' && (!item.expectedExitCode || item.expectedExitCode < 1))
    throw new Error(`Red behavior evidence requires an explicit expected nonzero exit: ${item.id}`);
  if (item.phase === 'green' && item.expectedExitCode !== undefined && item.expectedExitCode !== 0)
    throw new Error(`Green behavior evidence must expect exit zero: ${item.id}`);
  const passed = item.exitCode === (item.expectedExitCode ?? 0);
  if ((item.status === 'passed') !== passed)
    throw new Error(`Behavior evidence outcome contradicts its exit code: ${item.id}`);
}

if (import.meta.main) {
  const [runDirectory, outputDirectory, ...extra] = process.argv.slice(2);
  if (!runDirectory || !outputDirectory || extra.length)
    throw new Error('Usage: verification-report.ts <run-dir> <output-dir>');
  const { files, markdown: _markdown, ...report } = collectVerificationReport(runDirectory);
  const output = resolve(outputDirectory);
  for (const path of [...files.map((file) => file.path), 'report.json']) {
    const target = inspectPath(output, path, true);
    if (lstatSync(target, { throwIfNoEntry: false })) throw new Error(`Report output already exists: ${target}`);
  }
  for (const file of files) {
    const path = join(output, file.path);
    mkdirSync(dirname(path), { recursive: true });
    writeReportFile(path, file.content);
  }
  writeReportFile(join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ source: report.source, artifacts: report.artifacts }));
}
