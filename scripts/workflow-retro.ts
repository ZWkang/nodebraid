import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface FrictionEntry {
  phase: string;
  category: string;
  note: string;
  minutes?: number;
  rule?: string;
}

export interface RunFacts {
  id: string;
  delivery: string;
  preparedAt: string;
  publishedAt?: string;
  verifyAttempts: number;
  verifyPassed?: boolean;
  artifacts: number;
  friction: FrictionEntry[];
}

export interface RetroSignal {
  key: string;
  title: string;
  count: number;
  evidence: string[];
  direction: string[];
}

export interface RetroSummary {
  window: { since?: string; until: string };
  runs: number;
  deliveries: number;
  metrics: {
    runsPerDelivery: { average: number; max: number; churned: string[] };
    verify: { attempts: number; repeatedRuns: string[]; failedRuns: string[] };
    leadTimeHours: { median?: number; published: number };
    artifactsPerRun: { median?: number };
  };
  signals: RetroSignal[];
}

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateFriction(value: unknown, source: string): FrictionEntry[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (entry) =>
        !entry ||
        typeof entry !== 'object' ||
        typeof entry.phase !== 'string' ||
        !entry.phase.trim() ||
        typeof entry.category !== 'string' ||
        !kebab.test(entry.category) ||
        typeof entry.note !== 'string' ||
        !entry.note.trim() ||
        (entry.minutes !== undefined && !(Number.isFinite(entry.minutes) && entry.minutes >= 0)) ||
        (entry.rule !== undefined && (typeof entry.rule !== 'string' || !entry.rule.trim())),
    )
  )
    throw new Error(`${source} must be an array of {phase, category (kebab-case), note, minutes?, rule?}.`);
  return value as FrictionEntry[];
}

export function collectRun(directory: string, id: string): RunFacts | undefined {
  const prepared = join(directory, 'prepared-task.json');
  if (!existsSync(prepared)) return undefined;
  const task = JSON.parse(readFileSync(prepared, 'utf8')) as { source?: { kind?: string; number?: number } };
  if (!task.source?.kind || !Number.isSafeInteger(task.source.number))
    throw new Error(`${prepared} has no source identity.`);
  const files = readdirSync(directory);
  const verification = join(directory, 'verification.json');
  const publication = join(directory, 'publication.json');
  const retro = join(directory, 'retro.json');
  return {
    id,
    delivery: `${task.source.kind}#${task.source.number}`,
    preparedAt: statSync(prepared).mtime.toISOString(),
    ...(existsSync(publication) ? { publishedAt: statSync(publication).mtime.toISOString() } : {}),
    verifyAttempts: files.filter((name) => /^check-.+\.log$/.test(name)).length,
    ...(existsSync(verification)
      ? { verifyPassed: JSON.parse(readFileSync(verification, 'utf8')).checks?.exitCode === 0 }
      : {}),
    artifacts: files.length,
    friction: existsSync(retro) ? validateFriction(JSON.parse(readFileSync(retro, 'utf8')), retro) : [],
  };
}

export function collectRuns(runsDirectory: string): RunFacts[] {
  return readdirSync(runsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => collectRun(join(runsDirectory, entry.name), entry.name) ?? [])
    .sort((left, right) => left.preparedAt.localeCompare(right.preparedAt) || left.id.localeCompare(right.id));
}

const median = (values: number[]) => {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1]! + sorted[middle]!) / 2;
};
const round = (value: number) => Math.round(value * 10) / 10;

export function summarizeRetro(
  all: RunFacts[],
  options: { since?: string; until: string; threshold?: number },
): RetroSummary {
  const threshold = options.threshold ?? 3;
  if (!Number.isSafeInteger(threshold) || threshold < 1) throw new Error('Threshold must be a positive integer.');
  if (options.since !== undefined && Number.isNaN(Date.parse(options.since)))
    throw new Error('since must be an ISO date.');
  const runs = all.filter(
    (run) => (!options.since || run.preparedAt >= options.since) && run.preparedAt <= options.until,
  );
  const byDelivery = new Map<string, RunFacts[]>();
  for (const run of runs) byDelivery.set(run.delivery, [...(byDelivery.get(run.delivery) ?? []), run]);
  const churned = [...byDelivery].filter(([, items]) => items.length >= 3).map(([delivery]) => delivery);
  const repeatedRuns = runs.filter((run) => run.verifyAttempts > 1).map((run) => run.id);
  const failedRuns = runs.filter((run) => run.verifyPassed === false).map((run) => run.id);
  const leadTimes = runs
    .filter((run) => run.publishedAt)
    .map((run) => (Date.parse(run.publishedAt!) - Date.parse(run.preparedAt)) / 3_600_000);

  const signals: RetroSignal[] = [];
  const friction = new Map<string, { run: string; entry: FrictionEntry }[]>();
  for (const run of runs)
    for (const entry of run.friction)
      friction.set(entry.category, [...(friction.get(entry.category) ?? []), { run: run.id, entry }]);
  for (const [category, items] of friction) {
    if (items.length < threshold) continue;
    const minutes = items.reduce((total, { entry }) => total + (entry.minutes ?? 0), 0);
    signals.push({
      key: `friction:${category}`,
      title: `Recurring friction: ${category}`,
      count: items.length,
      evidence: items.map(
        ({ run, entry }) => `${run} (${entry.phase}${entry.minutes ? `, ${entry.minutes} min` : ''}): ${entry.note}`,
      ),
      direction: [
        ...(minutes ? [`Reported cost: ${minutes} minutes across ${items.length} runs.`] : []),
        ...new Set(items.flatMap(({ entry }) => (entry.rule ? [`Rule involved: ${entry.rule}`] : []))),
      ],
    });
  }
  if (churned.length >= threshold)
    signals.push({
      key: 'metric:delivery-churn',
      title: 'Deliveries need three or more runs',
      count: churned.length,
      evidence: churned.map((delivery) => `${delivery}: ${byDelivery.get(delivery)!.length} runs`),
      direction: ['Find which head, target or plan changes forced new runs and whether they were avoidable.'],
    });
  if (repeatedRuns.length + failedRuns.length >= threshold)
    signals.push({
      key: 'metric:repeated-full-check',
      title: 'Full checks repeat or fail after review',
      count: new Set([...repeatedRuns, ...failedRuns]).size,
      evidence: [...new Set([...repeatedRuns, ...failedRuns])],
      direction: ['Compare failing full-check steps with what check:affected selected for the same change.'],
    });

  return {
    window: { ...(options.since ? { since: options.since } : {}), until: options.until },
    runs: runs.length,
    deliveries: byDelivery.size,
    metrics: {
      runsPerDelivery: {
        average: byDelivery.size ? round(runs.length / byDelivery.size) : 0,
        max: Math.max(0, ...[...byDelivery.values()].map((items) => items.length)),
        churned,
      },
      verify: { attempts: runs.reduce((total, run) => total + run.verifyAttempts, 0), repeatedRuns, failedRuns },
      leadTimeHours: {
        ...(leadTimes.length ? { median: round(median(leadTimes)!) } : {}),
        published: leadTimes.length,
      },
      artifactsPerRun: runs.length ? { median: median(runs.map((run) => run.artifacts)) } : {},
    },
    signals,
  };
}

export function retroMarker(key: string): string {
  return `<!-- workflow-retro:${key} -->`;
}

export function renderProposal(signal: RetroSignal, summary: RetroSummary): { title: string; body: string } {
  const window = `${summary.window.since ?? 'all recorded runs'} – ${summary.window.until}`;
  return {
    title: `workflow: ${signal.title}`,
    body: [
      retroMarker(signal.key),
      '## Problem',
      '',
      `The workflow retrospective for ${window} found this pattern in ${signal.count} cases.`,
      '',
      '## Evidence',
      '',
      ...signal.evidence.map((item) => `- ${item}`),
      '',
      '## Direction',
      '',
      ...(signal.direction.length ? signal.direction.map((item) => `- ${item}`) : ['- To be designed.']),
      '',
      '## Acceptance',
      '',
      `- The next \`agents:retro\` window no longer reports \`${signal.key}\`, or the remaining cases are explained.`,
      '- Workflow changes follow the high-risk route in pr-risk and need human approval.',
    ].join('\n'),
  };
}

export function renderRetro(summary: RetroSummary): string {
  const { metrics } = summary;
  const list = (items: string[]) => (items.length ? items.join(', ') : 'none');
  return [
    '# Workflow retrospective',
    '',
    `Window: ${summary.window.since ?? 'all recorded runs'} – ${summary.window.until}`,
    `Runs: ${summary.runs} across ${summary.deliveries} deliveries.`,
    'Times use run artifact modification times; they approximate, not measure, elapsed work.',
    '',
    '## Metrics',
    '',
    `- Runs per delivery: average ${metrics.runsPerDelivery.average}, max ${metrics.runsPerDelivery.max}; three or more: ${list(metrics.runsPerDelivery.churned)}.`,
    `- Full-check attempts: ${metrics.verify.attempts}; repeated in ${list(metrics.verify.repeatedRuns)}; latest failed in ${list(metrics.verify.failedRuns)}.`,
    `- Prepare to publication: median ${metrics.leadTimeHours.median ?? 'n/a'} h over ${metrics.leadTimeHours.published} published runs.`,
    `- Artifacts per run: median ${metrics.artifactsPerRun.median ?? 'n/a'}.`,
    '',
    '## Signals',
    '',
    ...(summary.signals.length
      ? summary.signals.map((signal) => `- \`${signal.key}\` (${signal.count}): ${signal.title}`)
      : ['- No pattern reached the threshold.']),
    '',
  ].join('\n');
}
