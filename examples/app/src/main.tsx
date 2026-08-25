import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createRouter, RouterProvider } from '@tanstack/react-router';

import { routeTree } from './routeTree.gen';
import './styles.css';

const router = createRouter({ routeTree });
const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
const applyColorScheme = () => document.documentElement.classList.toggle('dark', colorScheme.matches);
applyColorScheme();
colorScheme.addEventListener('change', applyColorScheme);

if (import.meta.hot) {
  import.meta.hot.dispose(() => colorScheme.removeEventListener('change', applyColorScheme));
}

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const root = document.querySelector<HTMLElement>('#root');
if (!root) throw new Error('Examples Application root element is missing.');

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
