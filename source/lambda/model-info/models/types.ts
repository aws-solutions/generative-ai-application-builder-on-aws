// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Interface for retry settings
 */
export interface RetrySettings {
    maxRetries: number;
    backOffRate: number;
    initialDelayMs: number;
}