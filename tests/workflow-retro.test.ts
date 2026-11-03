import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { collectRuns, renderProposal, retroMarker, summarizeRetro, type RunFacts } from '../scripts/workflow-retro';

const run = (id: string, delivery: string, extra: Partial<RunFacts> = {}): RunFacts => ({
  id,
  delivery,
  preparedAt: '2026-11-01T00:00:00.000Z',
  verifyAttempts: 1,
  artifacts: 10,
  friction: [],
  ...extra,
});

test('recurring friction and churn become signals only at the threshold', () => {
  const friction = { phase: 'publish', category: 'evidence-readback', note: 'Connector readback repeated.' };
  const runs = [
    run('a', 'issue#1', { friction: [{ ...friction, minutes: 20, rule: 'pr-evidence readback' }] }),
    run('b', 'issue#2', { friction: [friction] }),
    run('c', 'issue#3', { friction: [{ ...friction, category: 'other-thing' }] }),
  ];
  const until = '2026-11-02T00:00:00.000Z';
  expect(summarizeRetro(runs, { until }).signals).toEqual([]);
  const summary = summarizeRetro([...runs, run('d', 'issue#4', { friction: [friction] })], { until });
  expect(summary.signals).toHaveLength(1);
  expect(summary.signals[0]).toMatchObject({ key: 'friction:evidence-readback', count: 3 });
  expect(summary.signals[0]!.direction).toEqual([
    'Reported cost: 20 minutes across 3 runs.',
    'Rule involved: pr-evidence readback',
  ]);

  const churn = ['1', '2', '3'].flatMap((n) => [
    run(`${n}x`, `issue#${n}`),
    run(`${n}y`, `issue#${n}`),
    run(`${n}z`, `issue#${n}`),
  ]);
  expect(summarizeRetro(churn, { until, threshold: 3 }).signals.map((signal) => signal.key)).toEqual([
    'metric:delivery-churn',
  ]);
  expect(summarizeRetro(churn, { until }).metrics.runsPerDelivery).toMatchObject({ average: 3, max: 3 });
});

test('the window excludes runs outside since/until and proposals carry a dedupe marker', () => {
  const runs = [
    run('old', 'issue#1', { preparedAt: '2026-10-01T00:00:00.000Z', verifyPassed: false }),
    run('new1', 'issue#2', { verifyAttempts: 2 }),
    run('new2', 'issue#3', { verifyPassed: false }),
    run('new3', 'issue#4', { verifyAttempts: 3, verifyPassed: true }),
  ];
  const summary = summarizeRetro(runs, { since: '2026-10-15T00:00:00.000Z', until: '2026-11-02T00:00:00.000Z' });
  expect(summary.runs).toBe(3);
  expect(summary.metrics.verify).toEqual({ attempts: 6, repeatedRuns: ['new1', 'new3'], failedRuns: ['new2'] });
  const signal = summary.signals.find((item) => item.key === 'metric:repeated-full-check')!;
  const proposal = renderProposal(signal, summary);
  expect(proposal.title).toBe('workflow: Full checks repeat or fail after review');
  expect(proposal.body.startsWith(retroMarker('metric:repeated-full-check'))).toBe(true);
  expect(() => summarizeRetro(runs, { since: 'yesterday', until: '2026-11-02T00:00:00.000Z' })).toThrow('ISO');
});

test('the CLI reads real run directories, rejects malformed friction and keeps earlier reports', () => {
  const root = mkdtempSync(join(tmpdir(), 'nodebraid-retro-'));
  const cli = resolve(import.meta.dir, '../scripts/retro.ts');
  const invoke = (...args: string[]) => Bun.spawnSync(['bun', cli, ...args], { cwd: root });
  try {
    for (const [id, issue] of [
      ['r1', 1],
      ['r2', 2],
      ['r3', 3],
    ] as const) {
      const directory = join(root, 'runs', id);
      mkdirSync(directory, { recursive: true });
      writeFileSync(
        join(directory, 'prepared-task.json'),
        JSON.stringify({ source: { kind: 'issue', number: issue } }),
      );
      writeFileSync(join(directory, 'check-1.log'), 'ok');
      writeFileSync(join(directory, 'verification.json'), JSON.stringify({ checks: { exitCode: 0 } }));
      writeFileSync(join(directory, 'publication.json'), '{}');
      utimesSync(
        join(directory, 'prepared-task.json'),
        new Date('2026-11-01T00:00:00Z'),
        new Date('2026-11-01T00:00:00Z'),
      );
      utimesSync(
        join(directory, 'publication.json'),
        new Date('2026-11-01T02:00:00Z'),
        new Date('2026-11-01T02:00:00Z'),
      );
      writeFileSync(
        join(directory, 'retro.json'),
        JSON.stringify([{ phase: 'review', category: 'duplicate-rule', note: `Run ${id} read the same rule twice.` }]),
      );
    }
    mkdirSync(join(root, 'runs', 'unprepared'));
    const result = invoke('--home', root);
    expect({ exitCode: result.exitCode, stderr: result.stderr.toString() }).toMatchObject({ exitCode: 0 });
    expect(result.stdout.toString()).toContain('friction:duplicate-rule');
    const reports = () => readdirSync(join(root, 'retros')).sort();
    const first = JSON.parse(readFileSync(join(root, 'retros', reports()[0]!, 'retro.json'), 'utf8'));
    expect(first.summary).toMatchObject({ runs: 3, deliveries: 3, metrics: { leadTimeHours: { median: 2 } } });
    expect(first.proposals.map((item: { key: string }) => item.key)).toEqual(['friction:duplicate-rule']);

    expect(invoke('--home', root).exitCode).toBe(0);
    expect(reports()).toHaveLength(2);
    const second = JSON.parse(readFileSync(join(root, 'retros', reports()[1]!, 'retro.json'), 'utf8'));
    expect(second.summary).toMatchObject({ window: { since: first.summary.window.until }, runs: 0 });

    writeFileSync(
      join(root, 'runs', 'r1', 'retro.json'),
      JSON.stringify([{ phase: 'review', category: 'Bad Name', note: 'x' }]),
    );
    expect(invoke('--home', root, '--since', '2026-01-01T00:00:00Z').stderr.toString()).toContain('kebab-case');
    expect(() => collectRuns(join(root, 'runs'))).toThrow('kebab-case');
  } finally {
    rmSync(root, { recursive: true });
  }
});
