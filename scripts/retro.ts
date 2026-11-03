import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';
import { collectRuns, renderProposal, renderRetro, summarizeRetro } from './workflow-retro';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { since: { type: 'string' }, threshold: { type: 'string' } },
});
const [runs, output] = positionals;
if (!runs || !output)
  throw new Error('Usage: retro <runs-dir> <empty-output-dir> [--since <ISO date>] [--threshold <n>]');
const out = resolve(output);
if (existsSync(out) && readdirSync(out).length)
  throw new Error('Retro output must be empty; earlier reports are retained.');
mkdirSync(out, { recursive: true });

const summary = summarizeRetro(collectRuns(resolve(runs)), {
  until: new Date().toISOString(),
  ...(values.since ? { since: values.since } : {}),
  ...(values.threshold ? { threshold: Number(values.threshold) } : {}),
});
const proposals = summary.signals.map((signal) => ({ key: signal.key, ...renderProposal(signal, summary) }));
writeFileSync(join(out, 'retro.json'), `${JSON.stringify({ summary, proposals }, null, 2)}\n`);
writeFileSync(join(out, 'retro.md'), renderRetro(summary));
console.log(JSON.stringify({ runs: summary.runs, signals: proposals.map(({ key, title }) => ({ key, title })) }));
