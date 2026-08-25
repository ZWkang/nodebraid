import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  validateSearch(search): Readonly<{ lang: 'en' | 'zh' }> {
    return { lang: search.lang === 'zh' ? 'zh' : 'en' };
  },
  component: ExamplesIndex,
});

function ExamplesIndex() {
  const { lang } = Route.useSearch();
  return (
    <main className="landing-page">
      <p className="eyebrow">NodeBraid Examples</p>
      <h1>
        {lang === 'zh' ? '探索真实的 Canvas Runtime 公共 interface。' : 'Explore the public Canvas Runtime seams.'}
      </h1>
      <Link className="primary-link" to="/basic-svg" search={{ lang }}>
        {lang === 'zh' ? '打开基础 SVG 画布' : 'Open Basic SVG Canvas'}
      </Link>
    </main>
  );
}
