const expectedVersion = 'v0.89.21';

export {};

async function command(args: string[]): Promise<{ stdout: string; stderr: string }> {
  const child = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (stderr) process.stderr.write(stderr);
  if (exitCode !== 0) {
    throw new Error(`${args.join(' ')} exited with code ${exitCode}.`);
  }
  return { stdout, stderr };
}

const versionOutput = await command(['gh', 'aw', 'version']);
const version = `${versionOutput.stdout}${versionOutput.stderr}`.trim();
if (version !== `gh aw version ${expectedVersion}`) {
  throw new Error(`Expected gh-aw ${expectedVersion}; received ${version}.`);
}
await command(['gh', 'aw', 'compile', '--strict', '--no-emit', '--no-check-update']);
const listing = await command(['gh', 'aw', 'list', '--stale', '--json']);
const stale = JSON.parse(listing.stdout) as { workflow: string }[];
if (stale.length > 0) {
  throw new Error(
    `Stale or missing compiled workflows: ${stale.map((item) => item.workflow).join(', ')}. Run bun run agents:compile.`,
  );
}
console.log(`Agentic workflows validated with gh-aw ${expectedVersion}; compiled files are current.`);
