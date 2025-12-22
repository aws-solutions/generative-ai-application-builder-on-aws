// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/// <reference types="vitest" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import * as path from 'path';
import { resolve } from 'node:path';

export default defineConfig({
    plugins: [react(), viteTsconfigPaths()],
    build: {
        outDir: 'build',
        chunkSizeWarningLimit: 4000,
        // Also build `login.html` so CloudFront can use it as a stable default root object
        rollupOptions: {
            input: {
                index: resolve(__dirname, 'index.html'),
                login: resolve(__dirname, 'login.html')
            }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    define: {
        global: 'window'
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './setupTests.ts',
        coverage: {
            provider: 'v8',
            reporter: ['lcov', 'text'],
            exclude: [
                '**/node_modules/**',
                '**/build/**',
                '**/.{git,tmp}/**',
                '**/interfaces/**',
                'src/__test__/**',
                'coverage/**',
                'test/*.js',
                'src/App.jsx',
                'src/index.jsx'
            ]
        },
        exclude: ['**/node_modules/**', '**/build/**', '**/.{git,tmp}/**']
    },
    server: {
        port: 5177
    }
});
