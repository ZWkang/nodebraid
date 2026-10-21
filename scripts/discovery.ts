import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { artifactDigest } from './local-agent-run';
import { syncDiscovery, completeDiscovery, discoveryFrontier, type DiscoveryState } from './discovery-queue';

const [mode, file, reportFile] = process.argv.slice(2);
if (!file || !['init', 'sync', 'finish'].includes(mode ?? ''))
  throw new Error('Usage: discovery init|sync queue.json | finish queue.json report.json');
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const head = git('rev-parse', 'HEAD');
if (git('status', '--porcelain') || head !== git('rev-parse', 'origin/main'))
  throw new Error('Discovery requires a clean checkout of fetched main.');
const path = resolve(file);
mkdirSync(dirname(path), { recursive: true });
const previous = mode === 'init' ? undefined : (JSON.parse(readFileSync(path, 'utf8')) as DiscoveryState);
if (mode === 'init' && existsSync(path)) throw new Error('Discovery is already initialized; sync the existing queue.');
const files = git('ls-tree', '-r', '--name-only', head).split('\n');
const seamFor = (name: string) =>
  name.startsWith('packages/')
    ? name.split('/').slice(0, 2).join('/')
    : name.startsWith('examples/')
      ? 'examples'
      : name.startsWith('docs/') || name.startsWith('website/')
        ? 'docs'
        : 'workflow';
const names = [...new Set(files.map(seamFor))].sort();
if (previous) git('merge-base', '--is-ancestor', previous.head, head);
const changed =
  previous && previous.head !== head
    ? [...new Set(git('diff', '--name-only', previous.head, head).split('\n').filter(Boolean).map(seamFor))]
    : [];
let queue = syncDiscovery(previous, head, names, changed);
if (mode === 'finish') {
  if (!reportFile) throw new Error('finish requires an investigation report');
  if (!previous || previous.head !== head) throw new Error('Sync the latest main before completing an investigation.');
  const report = JSON.parse(readFileSync(reportFile, 'utf8')) as {
    seam: string;
    head: string;
    evidence: string;
    remaining: string[];
    commands: { command: string; exitCode: number }[];
  };
  if (
    typeof report.evidence !== 'string' ||
    !report.evidence.trim() ||
    !Array.isArray(report.remaining) ||
    !Array.isArray(report.commands) ||
    !report.commands.length ||
    report.commands.some((c) => !c.command.trim() || c.exitCode !== 0)
  )
    throw new Error('Failed or missing execution evidence leaves the seam pending.');
  const artifact = join(dirname(path), `discovery-evidence-${artifactDigest(report)}.json`);
  queue = completeDiscovery(queue, {
    seam: report.seam,
    head: report.head,
    evidence: artifact,
    remaining: report.remaining,
  });
  if (!existsSync(artifact)) writeFileSync(artifact, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
}
writeFileSync(`${path}.tmp`, `${JSON.stringify(queue, null, 2)}\n`);
renameSync(`${path}.tmp`, path);
console.log(JSON.stringify({ ...queue, pending: discoveryFrontier(queue) }));
