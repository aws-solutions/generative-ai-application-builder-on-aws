import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    nodePolyfills({
      globals: {
        Buffer: true,
        process: true,
        global: true
      }
    })
  ],
  define: {
    // Some deps (notably buffer) still reference `global`
    global: 'globalThis'
  },
  build: {
    // The CDK React bundler in this repo expects `build/` output
    outDir: 'build',
    emptyOutDir: true,
    // Also build `login.html` so CloudFront can use it as a stable default root object
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html')
      }
    }
  },
  server: {
    port: 5175,
  },
  test: {
    environment: 'jsdom',
  },
});


