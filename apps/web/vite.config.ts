import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

import { resolveApiProxyTarget, resolveWebDevPorts } from './src/lib/config/dev-ports';

const { webPort } = resolveWebDevPorts(process.env);
const apiProxyTarget = resolveApiProxyTarget(process.env);

export default defineConfig({
  plugins: [sveltekit()],
  cacheDir: '.svelte-kit/vite',
  server: {
    host: '0.0.0.0',
    port: webPort,
    strictPort: true,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
});
