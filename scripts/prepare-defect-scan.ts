import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

export function createScanContext(head: string, base: string | undefined) {
  for (const value of [head, base]) {
    if (value !== undefined && !/^[a-f0-9]{40}$/.test(value)) {
      throw new Error('Defect investigation requires a complete commit SHA.');
    }
  }
  return {
    head,
    base: base ?? null,
    mode: base ? 'changes' : 'snapshot',
    range: base ? `${base}..${head}` : null,
  };
}

if (import.meta.main) {
  const run = (command: string, args: string[]) =>
    execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    }).trim();
  const head = run('git', ['rev-parse', 'HEAD']);
  if (run('git', ['status', '--porcelain'])) {
    throw new Error('Discovery requires a clean worktree so evidence matches its pinned SHA.');
  }
  if (head !== run('git', ['rev-parse', 'origin/main'])) {
    throw new Error('Discovery must use a checkout of the fetched origin/main snapshot.');
  }
  const context = createScanContext(head, process.argv[2]);
  if (context.base) run('git', ['merge-base', '--is-ancestor', context.base, context.head]);
  const files = run(
    'git',
    context.base ? ['diff', '--name-only', context.range!] : ['ls-tree', '-r', '--name-only', context.head],
  );
  await mkdir('.tmp', { recursive: true });
  await Bun.write(
    '.tmp/agent-defect-scan.json',
    JSON.stringify(
      {
        ...context,
        files: files ? files.split('\n') : [],
        repository: 'ZWkang/nodebraid',
      },
      null,
      2,
    ),
  );
  console.log(
    `Prepared ${context.mode} investigation at ${context.head}${context.base ? ` since ${context.base}` : ' (no completed discovery baseline)'}.`,
  );
}
