import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDeclarations } from '../../../scripts/collect-declarations';
import type { CommandService } from '../src/index';

const forbiddenImport =
  /(?:from\s+|import\()["'](?:@cflow\/(?:core|kernel|plugin-kernel|renderer-[^"']+)|cordis|rxjs)["']/;
const forbiddenCordisType = /\b(?:CordisError|Effect|Fiber|FiberState)\b/;

const pluginDist = fileURLToPath(new URL('../dist/', import.meta.url));
const pluginDeclaration = await readFile(join(pluginDist, 'index.d.ts'), 'utf8');
assert.match(pluginDeclaration, /export \{ CommandError/);
assert.match(pluginDeclaration, /export \{ commandPlugin, commandService \}/);
assert.match(pluginDeclaration, /export \{ defineCommand \}/);

for (const declaration of await collectDeclarations(pluginDist)) {
  assert.doesNotMatch(declaration.contents, forbiddenImport, declaration.path);
  assert.doesNotMatch(declaration.contents, forbiddenCordisType, declaration.path);
}

const pluginPackageName = '@cflow/plugin-command';
const runtimePackageName = '@cflow/runtime-cordis';
const pluginPackage = (await import(pluginPackageName)) as typeof import('../src/index');
const runtimePackage = await import(runtimePackageName);
const identity = pluginPackage.defineCommand<string, string>('artifact.identity');
let commands: CommandService | undefined;
const consumer = runtimePackage.definePlugin({
  requires: { commands: pluginPackage.commandService },
  setup(context) {
    commands = context.services.commands;
    const registration = commands.register(identity, (input) => input);
    context.own(() => registration.dispose());
  },
});
const host = runtimePackage.createPluginHost();
host.install(pluginPackage.commandPlugin);
const installation = host.install(consumer);
await installation.whenActive();
assert.ok(commands);
assert.equal(await commands.execute(identity, 'ready'), 'ready');
await host.dispose();
