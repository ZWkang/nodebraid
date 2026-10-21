import { appendFileSync, readFileSync } from 'node:fs';

const fixture = JSON.parse(readFileSync(process.env.NODEBRAID_EVIDENCE_API_FIXTURE, 'utf8'));

// Only the child CLI's external GitHub transport is replaced; no network or publication writes are permitted.
globalThis.fetch = async (input, options) => {
  const url = new URL(typeof input === 'string' ? input : (input.url ?? input.toString()));
  const method = options?.method ?? 'GET';
  appendFileSync(fixture.requests, `${method} ${url.pathname}${url.search}\n`);
  if (url.origin !== 'https://api.github.com' || method !== 'GET') {
    throw new Error(`Unexpected external request: ${method} ${url}`);
  }
  const root = '/repos/ZWkang/nodebraid';
  if (url.pathname === `${root}/actions/runs/${fixture.run.id}`) {
    return new Response(JSON.stringify(fixture.run), { status: fixture.runStatus });
  }
  if (url.pathname === `${root}/commits/${fixture.run.head_sha}/pulls`) {
    const page = Number(url.searchParams.get('page'));
    return new Response(JSON.stringify(fixture.pages[page - 1] ?? []), { status: fixture.pullsStatus });
  }
  throw new Error(`Unexpected external request: ${url}`);
};
