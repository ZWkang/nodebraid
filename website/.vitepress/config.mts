import { defineConfig, type DefaultTheme } from 'vitepress';

import { capabilityGroups } from './module-catalog.mts';
import { tokenizeForSearch } from './search.mts';
import { localizeDocumentationPath, siteNavigationItems } from '../shared/navigation';

type Locale = 'zh' | 'en';

const base = process.env.NODEBRAID_DOCS_BASE ?? '/';

function localizedPath(locale: Locale, path: string): string {
  return locale === 'en' ? `/en${path}` : path;
}

function createThemeConfig(locale: Locale): DefaultTheme.Config {
  const english = locale === 'en';
  return {
    darkModeSwitchLabel: english ? 'Appearance' : '外观',
    docFooter: {
      next: english ? 'Next page' : '下一页',
      prev: english ? 'Previous page' : '上一页',
    },
    externalLinkIcon: true,
    footer: {
      copyright: 'Copyright © 2026 NodeBraid contributors',
      message: 'Released under the MIT License.',
    },
    langMenuLabel: english ? 'Change language' : '切换语言',
    lastUpdated: {
      text: english ? 'Last updated' : '最后更新',
    },
    nav: siteNavigationItems.map((item) => ({
      text: item.labels[locale],
      link: 'externalHref' in item ? item.externalHref : localizeDocumentationPath(locale, item.documentationPath),
    })),
    outline: {
      label: english ? 'On this page' : '本页内容',
      level: [2, 3],
    },
    returnToTopLabel: english ? 'Return to top' : '返回顶部',
    search: {
      provider: 'local',
      options: {
        miniSearch: {
          options: {
            processTerm: (term) => term,
            tokenize: tokenizeForSearch,
          },
        },
        ...(english
          ? {}
          : {
              translations: {
                button: {
                  buttonAriaLabel: '搜索文档',
                  buttonText: '搜索',
                },
                modal: {
                  backButtonTitle: '关闭搜索',
                  displayDetails: '显示详细列表',
                  footer: {
                    closeKeyAriaLabel: '关闭搜索',
                    closeText: '关闭',
                    navigateDownKeyAriaLabel: '下一个结果',
                    navigateText: '选择',
                    navigateUpKeyAriaLabel: '上一个结果',
                    selectKeyAriaLabel: '打开结果',
                    selectText: '打开',
                  },
                  noResultsText: '没有找到相关内容',
                  resetButtonTitle: '清除搜索',
                },
              },
            }),
      },
    },
    sidebar: [
      {
        text: english ? 'Get Started' : '开始使用',
        items: [
          { text: 'Quick Start', link: localizedPath(locale, '/guide/quick-start') },
          { text: english ? 'Capability Map' : '能力地图', link: localizedPath(locale, '/capabilities/') },
          { text: english ? 'All Modules' : '全部模块', link: localizedPath(locale, '/modules/') },
        ],
      },
      {
        text: english ? 'Capabilities & Modules' : '能力与模块',
        items: capabilityGroups.map((group) => ({
          collapsed: true,
          items: group.modules.map((module) => ({
            link: localizedPath(locale, `/modules/${module.slug}`),
            text: module.name,
          })),
          link: localizedPath(locale, `/capabilities/${group.slug}`),
          text: group.title,
        })),
      },
      {
        text: english ? 'Project' : '项目状态',
        items: [
          { text: english ? 'Current Status' : '当前状态', link: localizedPath(locale, '/status') },
          { text: 'Roadmap', link: localizedPath(locale, '/roadmap') },
        ],
      },
    ],
    sidebarMenuLabel: english ? 'Menu' : '菜单',
    siteTitle: 'NodeBraid',
    skipToContentLabel: english ? 'Skip to content' : '跳到正文',
    socialLinks: [{ icon: 'github', link: 'https://github.com/ZWkang/nodebraid' }],
  };
}

export default defineConfig({
  base,
  cleanUrls: true,
  description: '可组合、Renderer-agnostic 的 headless flow canvas engine。',
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }],
    ['meta', { name: 'theme-color', content: '#07111f' }],
    ['meta', { name: 'color-scheme', content: 'dark light' }],
  ],
  lang: 'zh-CN',
  lastUpdated: true,
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
    },
    en: {
      description: 'A composable, renderer-agnostic headless flow canvas engine.',
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      themeConfig: createThemeConfig('en'),
    },
  },
  markdown: {
    theme: {
      dark: 'github-dark',
      light: 'github-light',
    },
  },
  themeConfig: createThemeConfig('zh'),
  title: 'NodeBraid',
  titleTemplate: ':title · NodeBraid',
});
