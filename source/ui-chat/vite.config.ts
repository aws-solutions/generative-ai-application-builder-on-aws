// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig, UserConfig } from 'vite';
import { UserConfig as VitestUserConfig } from 'vitest/node';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';

const config: VitestUserConfig & UserConfig = {
    test: {
        globals: true, // makes describe, it, expect available without import
        environment: 'jsdom',
        setupFiles: ['./src/setupTests.ts'], // runs this file before all tests
        include: ['./src/__tests__/**/*.test.ts?(x)'],
        exclude: [
            '**/node_modules/**',
            '**/build/**',
            '**/.{git,tmp}/**',
            '**/interfaces/**',
            'src/__test__/**',
            'coverage/**',
            'test/*.js'
        ],
        coverage: {
            provider: 'v8',
            enabled: true,
            reportsDirectory: resolve(__dirname, './coverage'),
            exclude: [
                '**/build/**',
                'src/App.tsx',
                '**/types.ts',
                'src/models/**',
                'src/constants/**',
                '**/*.d.ts',
                '**/index.ts',
                'src/mocks/**',
                'vite.config.ts',
                '.eslintrc.cjs',
                'public/mockServiceWorker.js'
            ]
        },
        maxConcurrency: 1, // set to 1 to run tests serially, one file at a time
        testTimeout: 25000 // 25s test timeout unless specified otherwise in the test suite
    },
    plugins: [react()],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@hooks': resolve(__dirname, './src/hooks'),
            '@components': resolve(__dirname, './src/components'),
            '@contexts': resolve(__dirname, './src/contexts'),
            '@reducers': resolve(__dirname, './src/reducers'),
            '@utils': resolve(__dirname, './src/utils'),
            '@store': resolve(__dirname, './src/store'),
            '@pages': resolve(__dirname, './src/pages'),
            '@models': resolve(__dirname, './src/models')
        }
    },
    /**
     * Content Security Policy (CSP) Configuration for Local Development
     *
     * This CSP configuration provides basic security controls while allowing necessary functionality:
     * - Allows images from same origin and data URIs
     * - Restricts object sources to none for security
     * - Permits web workers from same origin and blob URLs
     * - Prevents iframe embedding for clickjacking protection
     * - Enables connections to local, WebSocket, and AWS services
     * - Allows data URI fonts
     * - Forces HTTPS upgrades
     *
     * Note: default-src, script-src, and style-src directives are intentionally omitted
     * to allow development functionality. Production deployment implements a stricter
     * CSP through CloudFront configuration, following security best practices.
     */
    server: {
        port: 5178,
        headers: {
            'Content-Security-Policy': [
                "img-src 'self' data:",
                "object-src 'none'",
                "worker-src 'self' blob:",
                "frame-ancestors 'none'",
                "connect-src 'self' wss: https://*.amazonaws.com https://*.amazoncognito.com",
                'font-src data:',
                'upgrade-insecure-requests'
            ].join('; ')
        }
    },
    exclude: ['**/node_modules/**', '**/build/**', '**/.{git,tmp}/**'],
    build: {
        outDir: 'build',
        chunkSizeWarningLimit: 4000
    },
    define: {
        __ENV_CHECK__: JSON.stringify(process.env)
    }
};
export default defineConfig(config);
