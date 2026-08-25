export type SiteLocale = 'en' | 'zh';
export type SiteNavigationId = 'documentation' | 'capabilities' | 'modules' | 'interactive-example' | 'github';

export type SiteNavigationItem =
  | Readonly<{
      id: Exclude<SiteNavigationId, 'github'>;
      labels: Readonly<Record<SiteLocale, string>>;
      documentationPath: string;
    }>
  | Readonly<{
      id: 'github';
      labels: Readonly<Record<SiteLocale, string>>;
      externalHref: string;
    }>;

export const publicDocumentationBase = 'https://zwkang.github.io/nodebraid';

export const siteNavigationItems: readonly SiteNavigationItem[] = Object.freeze([
  Object.freeze({
    id: 'documentation',
    labels: Object.freeze({ en: 'Documentation', zh: '文档' }),
    documentationPath: '/',
  }),
  Object.freeze({
    id: 'capabilities',
    labels: Object.freeze({ en: 'Capabilities', zh: '能力' }),
    documentationPath: '/capabilities/',
  }),
  Object.freeze({
    id: 'modules',
    labels: Object.freeze({ en: 'Modules', zh: '模块' }),
    documentationPath: '/modules/',
  }),
  Object.freeze({
    id: 'interactive-example',
    labels: Object.freeze({ en: 'Interactive Example', zh: '交互示例' }),
    documentationPath: '/guide/interactive-example',
  }),
  Object.freeze({
    id: 'github',
    labels: Object.freeze({ en: 'GitHub', zh: 'GitHub' }),
    externalHref: 'https://github.com/ZWkang/nodebraid',
  }),
]);

export function localizeDocumentationPath(locale: SiteLocale, path: string): string {
  return locale === 'en' ? `/en${path}` : path;
}

export function publicDocumentationHref(locale: SiteLocale, path: string): string {
  return `${publicDocumentationBase}${localizeDocumentationPath(locale, path)}`;
}
