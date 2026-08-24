import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const sessionDirectory = '/Users/zhou/.codex/sessions/2026/08/19';
const oldPaths = [
  '/private/tmp/nodebraid-documentation-site',
  '/Users/zhou/.codex/worktrees/nodebraid-documentation-site',
];
const destination = '/Users/zhou/.codex/worktrees/nodebraid-documentation-site';
const recoveryCutoff = '2026-08-19T14:00:00.000Z';
const calls = [];
const outputs = new Map();

for (const name of readdirSync(sessionDirectory)) {
  if (!name.endsWith('.jsonl')) continue;
  const file = join(sessionDirectory, name);
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue;
    const event = JSON.parse(line);
    if (event.type !== 'response_item') continue;
    if (event.timestamp >= recoveryCutoff) continue;
    const payload = event.payload;
    if (payload.type === 'custom_tool_call_output') {
      const text = Array.isArray(payload.output)
        ? payload.output.map((item) => item.text ?? '').join('\n')
        : String(payload.output ?? '');
      outputs.set(payload.call_id, text);
      continue;
    }
    if (payload.type !== 'custom_tool_call' || payload.name !== 'exec') continue;
    const input = payload.input ?? '';
    const invocationMatch = input.match(/tools\.apply_patch\((\w+)\)/);
    if (!invocationMatch) continue;
    if (!oldPaths.some((path) => input.includes(path))) continue;
    const variable = invocationMatch[1];
    const startMarker = `const ${variable} = `;
    const start = input.indexOf(startMarker);
    const invocation = input.indexOf(`tools.apply_patch(${variable})`);
    const end = input.lastIndexOf(';', invocation);
    if (start < 0 || invocation < 0 || end < 0) {
      throw new Error(`Cannot parse apply_patch call ${payload.call_id} from ${file}`);
    }
    const literal = input.slice(start + startMarker.length, end).trim();
    const patch = JSON.parse(literal);
    calls.push({ callId: payload.call_id, patch, timestamp: event.timestamp, file });
  }
}

const relevant = calls
  .filter(({ patch }) => oldPaths.some((path) => patch.includes(path)))
  .filter(({ callId }) => {
    const output = outputs.get(callId) ?? '';
    return output.includes('Script completed') && !output.includes('Script failed');
  })
  .sort((left, right) => left.timestamp.localeCompare(right.timestamp));

console.log(`recoverable successful patches: ${relevant.length}`);
if (process.argv.includes('--list')) {
  for (const [index, call] of relevant.entries()) {
    const target = call.patch.match(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/m)?.[1] ?? 'unknown';
    console.log(`${index + 1}\t${call.timestamp}\t${call.callId}\t${target}`);
  }
}
if (!process.argv.includes('--apply')) process.exit(0);
const startArgument = process.argv.find((argument) => argument.startsWith('--start='));
const startIndex = startArgument ? Number(startArgument.slice('--start='.length)) - 1 : 0;
const callArgument = process.argv.find((argument) => argument.startsWith('--call='));
const requestedCall = callArgument?.slice('--call='.length);

for (const [index, call] of relevant.entries()) {
  if (index < startIndex) continue;
  if (requestedCall && call.callId !== requestedCall) continue;
  let patch = call.patch;
  for (const oldPath of oldPaths) patch = patch.replaceAll(oldPath, destination);
  const result = spawnSync('apply_patch', [], {
    cwd: destination,
    encoding: 'utf8',
    input: patch,
  });
  if (result.status !== 0) {
    console.error(`Patch ${index + 1}/${relevant.length} failed: ${call.callId}`);
    console.error(result.stdout);
    console.error(result.stderr);
    process.exit(result.status ?? 1);
  }
  console.log(`applied ${index + 1}/${relevant.length}: ${call.callId}`);
}
