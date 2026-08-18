import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface DeclarationFile {
  readonly path: string;
  readonly contents: string;
}

export async function collectDeclarations(directory: string): Promise<DeclarationFile[]> {
  const declarations: DeclarationFile[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      declarations.push(...(await collectDeclarations(entryPath)));
    } else if (entry.name.endsWith('.d.ts')) {
      declarations.push({ path: entryPath, contents: await readFile(entryPath, 'utf8') });
    }
  }
  return declarations;
}
