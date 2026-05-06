import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Ensures __REACT_DEVTOOLS_GLOBAL_HOOK__ has a `renderers` Map before
// made-refine/preload.js runs, so React Refresh's injectIntoGlobalHook
// doesn't crash on hook.renderers.forEach.
function devToolsHookPlugin() {
  return {
    name: 'devtools-hook-init',
    enforce: 'pre' as const,
    transformIndexHtml: {
      order: 'pre' as const,
      handler() {
        return [
          {
            tag: 'script',
            injectTo: 'head-prepend' as const,
            children: `(function(){var h=window.__REACT_DEVTOOLS_GLOBAL_HOOK__;if(h&&!h.renderers)h.renderers=new Map();})();`,
          },
        ];
      },
    },
  };
}

// https://vite.dev/config
export default defineConfig({
  root: 'web',
  plugins: [devToolsHookPlugin(), react(), tailwindcss()],
  resolve: {
    alias: {
      '~': path.resolve(import.meta.dirname, 'web'),
    },
  },
  server: {
    proxy: {
      '/api/web': 'http://localhost:3000',
      '/api/files': 'http://localhost:3000',
      '/api/configs': 'http://localhost:3000',
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
