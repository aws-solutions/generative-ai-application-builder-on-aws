// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { RETRY_CONFIG } from './constants';

export interface RetrySettings {
    maxRetries: number;
    backOffRate: number;
    initialDelayMs: number;
}

export function getRetrySettings(): RetrySettings {
    return {
        maxRetries: RETRY_CONFIG.maxRetries,
        backOffRate: RETRY_CONFIG.backOffRate,
        initialDelayMs: RETRY_CONFIG.initialDelayMs
    };
}

export function delay(delayMillis: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, delayMillis);
    });
}
