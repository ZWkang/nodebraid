import { capabilityGroups, modules } from '../.vitepress/module-catalog.mts';
import { tokenizeForSearch } from '../.vitepress/search.mts';

const forbiddenContent = ['bun add @nodebraid/core'] as const;
const matches: string[] = [];
const pagePaths: string[] = [];
let searchCorpus = '';

for await (const path of new Bun.Glob('**/*.md').scan({ cwd: 'website', onlyFiles: true })) {
  pagePaths.push(path);
  const content = await Bun.file(`website/${path}`).text();
  searchCorpus += `\n${content}`;
  for (const forbidden of forbiddenContent) {
    if (content.includes(forbidden)) matches.push(`${path}: ${forbidden}`);
  }
  if (path.startsWith('en/') && /\]\(\/(?:guide|modules|capabilities|status|roadmap)(?:[/#)]|$)/.test(content)) {
    matches.push(`${path}: English internal link is missing the /en prefix`);
  }
}

const rootPages = pagePaths.filter((path) => !path.startsWith('en/')).sort();
const englishPages = pagePaths
  .filter((path) => path.startsWith('en/'))
  .map((path) => path.slice(3))
  .sort();
if (JSON.stringify(rootPages) !== JSON.stringify(englishPages)) {
  throw new Error(
    `English locale pages do not match the default locale.\nDefault: ${rootPages.join(', ')}\nEnglish: ${englishPages.join(', ')}`,
  );
}

const indexedTerms = new Set(tokenizeForSearch(searchCorpus));
for (const query of ['内核', '权威', 'kernel', 'authoritative']) {
  const queryTerms = tokenizeForSearch(query);
  if (queryTerms.length === 0 || queryTerms.some((term) => !indexedTerms.has(term))) {
    throw new Error(`Chinese search tokenization cannot match the required query: ${query}`);
  }
}

if (matches.length > 0) {
  throw new Error(`Documentation contains unsafe unpublished-package commands:\n${matches.join('\n')}`);
}

const workspacePackages: string[] = [];
for await (const path of new Bun.Glob('*/package.json').scan({ cwd: 'packages', onlyFiles: true })) {
  const manifest = await Bun.file(`packages/${path}`).json();
  workspacePackages.push(manifest.name as string);
}

const catalogPackages = modules.map((module) => module.name).sort();
workspacePackages.sort();
if (JSON.stringify(catalogPackages) !== JSON.stringify(workspacePackages)) {
  throw new Error(
    `Documentation module catalog does not match workspace packages.\nCatalog: ${catalogPackages.join(', ')}\nWorkspace: ${workspacePackages.join(', ')}`,
  );
}

for (const group of capabilityGroups) {
  const capabilityPage = Bun.file(`website/capabilities/${group.slug}.md`);
  if (!(await capabilityPage.exists())) throw new Error(`Missing capability page: ${group.slug}`);
  const englishCapabilityPage = Bun.file(`website/en/capabilities/${group.slug}.md`);
  if (!(await englishCapabilityPage.exists())) throw new Error(`Missing English capability page: ${group.slug}`);
  for (const module of group.modules) {
    const modulePage = Bun.file(`website/modules/${module.slug}.md`);
    if (!(await modulePage.exists())) throw new Error(`Missing module page: ${module.name}`);
    const moduleContent = await modulePage.text();
    if (!moduleContent.includes('::: warning Package 尚未公开发布')) {
      throw new Error(`Module page is missing the unpublished-package warning: ${module.name}`);
    }
    const englishModulePage = Bun.file(`website/en/modules/${module.slug}.md`);
    if (!(await englishModulePage.exists())) throw new Error(`Missing English module page: ${module.name}`);
    const englishModuleContent = await englishModulePage.text();
    if (!englishModuleContent.includes('::: warning Package is not publicly released')) {
      throw new Error(`English module page is missing the unpublished-package warning: ${module.name}`);
    }
  }
}

console.log(`documentation content verified (${modules.length} modules)`);
