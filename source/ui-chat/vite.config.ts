/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 **********************************************************************************************************************/
/// <reference types="vitest" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import * as path from 'path';
import tailwindcss from 'tailwindcss';

export default defineConfig({
    plugins: [react(), viteTsconfigPaths()],
    css: {
        postcss: {
            plugins: [tailwindcss()]
        }
    },
    build: {
        outDir: 'build',
        chunkSizeWarningLimit: 4000
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
        port: 5178
    }
});
