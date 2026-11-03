import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { collectRuns, renderProposal, renderRetro, summarizeRetro, type RetroSummary } from './workflow-retro';

const { values } = parseArgs({
  options: { since: { type: 'string' }, threshold: { type: 'string' }, home: { type: 'string' } },
});
const home = resolve(
  values.home ?? join(process.env.CODEX_HOME ?? join(homedir(), '.codex'), 'local-workflows/nodebraid'),
);
const retros = join(home, 'retros');
const previous = existsSync(retros)
  ? readdirSync(retros)
      .filter((name) => existsSync(join(retros, name, 'retro.json')))
      .sort()
      .at(-1)
  : undefined;
const since =
  values.since ??
  (previous
    ? (JSON.parse(readFileSync(join(retros, previous, 'retro.json'), 'utf8')) as { summary: RetroSummary }).summary
        .window.until
    : undefined);

if (!existsSync(join(home, 'runs'))) throw new Error(`No local workflow runs at ${join(home, 'runs')}.`);
const until = new Date().toISOString();
const summary = summarizeRetro(collectRuns(join(home, 'runs')), {
  until,
  ...(since ? { since } : {}),
  ...(values.threshold ? { threshold: Number(values.threshold) } : {}),
});
const out = join(retros, until.replaceAll(':', '-'));
mkdirSync(out, { recursive: true });
const proposals = summary.signals.map((signal) => ({ key: signal.key, ...renderProposal(signal, summary) }));
writeFileSync(join(out, 'retro.json'), `${JSON.stringify({ summary, proposals }, null, 2)}\n`);
const report = renderRetro(summary);
writeFileSync(join(out, 'retro.md'), report);
console.log(`${report}\nSaved to ${out}`);
