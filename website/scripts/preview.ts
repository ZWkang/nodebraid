import { extname, resolve, sep } from 'node:path';

const base = '/cflow/';
const root = resolve(import.meta.dir, '../.vitepress/dist');
const rootPrefix = `${root}${sep}`;
const index = Bun.file(resolve(root, 'index.html'));

if (!(await index.exists())) {
  throw new Error('Documentation build not found. Run "bun run docs:build" before previewing.');
}

const server = Bun.serve({
  hostname: process.env.CFLOW_DOCS_PREVIEW_HOST ?? '127.0.0.1',
  port: Number(process.env.CFLOW_DOCS_PREVIEW_PORT ?? '4173'),
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/cflow') return Response.redirect(`${url.origin}${base}`, 308);
    if (url.pathname === '/') return Response.redirect(`${url.origin}${base}`, 308);
    if (!url.pathname.startsWith(base)) return notFound();

    const relativePath = decodeURIComponent(url.pathname.slice(base.length));
    const candidates = relativePath.endsWith('/')
      ? [resolve(root, relativePath, 'index.html')]
      : extname(relativePath)
        ? [resolve(root, relativePath)]
        : [resolve(root, `${relativePath}.html`), resolve(root, relativePath, 'index.html')];

    for (const candidate of candidates) {
      if (candidate !== root && !candidate.startsWith(rootPrefix)) {
        return new Response('Invalid documentation path.', { status: 400 });
      }
      const file = Bun.file(candidate);
      if (await file.exists()) return new Response(file);
    }
    return notFound();
  },
});

console.log(`Documentation preview: ${server.url.origin}${base}`);

async function notFound(): Promise<Response> {
  const page = Bun.file(resolve(root, '404.html'));
  return new Response((await page.exists()) ? page : 'Documentation page not found.', { status: 404 });
}
