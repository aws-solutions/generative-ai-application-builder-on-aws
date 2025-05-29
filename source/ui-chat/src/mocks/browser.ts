// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

interface MockServerConfig {
    apiEndpoint?: string;
    wsEndpoint?: string;
}

/**
 * This function enables mock-service-worker (msw) in the browser, so you can do local frontend development against the mock handlers.
 * If you want your local development environment to run against the cloud backend instead,
 * you can delete this entire file.
 * Without this file, you can still utilize mock-service-worker as mock server in unit tests.
 *
 * With this file, only http requests to the defined handlers are intercepted and handled by the mock server.
 * Requests to different endpoints are still sent to the defined url and not affected by msw.
 */
export async function startMockServer(config: MockServerConfig) {
    const { setupWorker } = await import('msw/browser');
    const { handlers } = await import('./handlers');
    const { createWebSocketHandlers } = await import('./websocket-handlers');

    // Initialize handlers array
    let allHandlers = [];

    // Add HTTP handlers if apiEndpoint is provided
    if (config.apiEndpoint) {
        allHandlers.push(...handlers(config.apiEndpoint));
    }

    // Add WebSocket handlers if wsEndpoint is provided
    if (config.wsEndpoint) {
        allHandlers.push(...createWebSocketHandlers(config.wsEndpoint));
    }

    const worker = setupWorker(...allHandlers);

    return worker.start({
        onUnhandledRequest(request, print) {
            // the Solutions-Engineering-Front-End-Template comes with a backend integration demo for the /count endpoint,
            // so MSW is purposefully not handling those. hence suppress warnings.
            if (request.url.includes('/prod/count')) {
                return;
            }

            // Print the regular MSW unhandled request warning otherwise
            print.warning();
        }
    });
}
