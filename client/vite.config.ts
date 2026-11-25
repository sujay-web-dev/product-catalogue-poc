import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    // The client only ever calls our backend, on the same origin (no CORS).
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        // Dev only: one line per API call in this terminal. Bodies are never logged.
        configure(proxy) {
          proxy.on('proxyRes', (proxyRes, req) => {
            console.info(`[api] ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
          });
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
