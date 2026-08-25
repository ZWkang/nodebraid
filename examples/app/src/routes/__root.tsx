import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Languages } from 'lucide-react';

import { TooltipProvider } from '@/components/ui/tooltip';
import { publicDocumentationHref, siteNavigationItems, type SiteLocale } from '../../../../website/shared/navigation';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const locale: SiteLocale = new URLSearchParams(window.location.search).get('lang') === 'zh' ? 'zh' : 'en';
  const nextLocale: SiteLocale = locale === 'en' ? 'zh' : 'en';
  const languageHref = `${window.location.pathname}?lang=${nextLocale}`;

  return (
    <TooltipProvider>
      <div className="example-shell">
        <header className="site-header">
          <a className="site-brand" href={`/?lang=${locale}`}>
            NodeBraid
          </a>
          <div className="site-navigation-actions">
            <nav data-site-navigation aria-label={locale === 'zh' ? '站点导航' : 'Site navigation'}>
              {siteNavigationItems.map((item) => (
                <a
                  key={item.id}
                  data-site-navigation-item={item.id}
                  href={exampleNavigationHref(item, locale)}
                  aria-current={item.id === 'interactive-example' ? 'page' : undefined}
                >
                  {item.labels[locale]}
                </a>
              ))}
            </nav>
            <a
              className="language-switch"
              aria-label={locale === 'en' ? '切换到中文' : 'Switch to English'}
              href={languageHref}
            >
              <Languages />
            </a>
          </div>
        </header>
        <Outlet />
      </div>
    </TooltipProvider>
  );
}

function exampleNavigationHref(item: (typeof siteNavigationItems)[number], locale: SiteLocale): string {
  if (item.id === 'interactive-example') return `/basic-svg?lang=${locale}`;
  if ('externalHref' in item) return item.externalHref;
  return publicDocumentationHref(locale, item.documentationPath);
}
