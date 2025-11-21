// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { logger, tracer, metrics } from '../power-tools-init';
import { MULTIMODAL_ENABLED_ENV_VAR, USE_CASES_TABLE_NAME_ENV_VAR, CloudWatchMetrics } from '../utils/constants';
import { MultimodalCache } from '../utils/multimodal-cache';
import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { DdbConfigService } from '../services/ddb-config-service';

/**
 * Service for validating file management capabilities including multimodal support
 */
export class FileValidator {
    private ddbConfigService: DdbConfigService;
    private useCasesTable: string;

    constructor() {
        this.ddbConfigService = new DdbConfigService();
        this.useCasesTable = process.env[USE_CASES_TABLE_NAME_ENV_VAR]!;
    }

    /**
     * Checks cached multimodal validation status and handles cache-based validation
     * @param useCaseId - The use case ID to check in cache
     * @returns Promise<boolean> - Returns true if validation should continue, false if already validated from cache
     * @throws Error if multimodal is disabled (cached)
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateCachedMultimodalResult' })
    private async validateCachedMultimodalResult(useCaseId: string): Promise<boolean> {
        const cachedMultimodalEnabled = MultimodalCache.get(useCaseId); // returns boolean based on whether multimodality was fetched before (true/false) or not (undefined)

        if (cachedMultimodalEnabled !== undefined) {
            if (!cachedMultimodalEnabled) {
                const errorMsg = `Multimodal functionality is not enabled for use case: ${useCaseId}`;
                logger.error(errorMsg);
                metrics.addMetric(CloudWatchMetrics.MULTIMODAL_DISABLED_ERROR, MetricUnit.Count, 1);
                throw new Error(errorMsg);
            }
            logger.debug(`Multimodal capability validated from cache for useCaseId: ${useCaseId}`);
            return false; // Cache hit - no need to continue validation
        }

        // Clean up expired cache entries periodically
        MultimodalCache.cleanupExpiredEntries();
        return true; // Cache miss - continue with validation
    }

    /**
     * Validates that multimodal functionality is enabled for the given use case
     * @param useCaseId - The use case ID for validation and error messages
     * @throws Error if multimodal is not enabled
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateMultimodalCapability' })
    public async validateMultimodalCapability(useCaseId: string): Promise<void> {
        // Check cache first
        const shouldContinueValidation = await this.validateCachedMultimodalResult(useCaseId);
        if (!shouldContinueValidation) {
            return; // multimodality is enabled
        }

        let multimodalEnabled = false;

        // Check if MULTIMODAL_ENABLED_ENV_VAR is set
        const multimodalEnabledEnv = process.env[MULTIMODAL_ENABLED_ENV_VAR];
        if (multimodalEnabledEnv) {
            multimodalEnabled = multimodalEnabledEnv.toLowerCase() === 'true';
            logger.debug(`Multimodal capability determined from environment variable: ${multimodalEnabled}`);
        } else {
            // Query USE_CASES_TABLE and then USE_CASE_CONFIG_TABLE to check if multimodality is enabled on this use case
            if (!this.useCasesTable) {
                const errorMsg = `Neither ${MULTIMODAL_ENABLED_ENV_VAR} nor ${USE_CASES_TABLE_NAME_ENV_VAR} environment variables are available`;
                logger.error(errorMsg);
                throw new Error(errorMsg);
            }

            try {
                const useCaseRecordConfigKey = await this.ddbConfigService.fetchUseCaseConfigRecordKey(useCaseId);
                multimodalEnabled = await this.ddbConfigService.fetchUseCaseMultimodalityConfig(useCaseRecordConfigKey);
            } catch (error) {
                logger.error(
                    `Failed to validate multimodal capability for useCaseId: ${useCaseId}, error: ${(error as Error).message}`
                );
                throw new Error(`Multimodal validation failed: ${(error as Error).message}`);
            }
        }

        // Cache the result
        MultimodalCache.set(useCaseId, multimodalEnabled);

        if (!multimodalEnabled) {
            const errorMsg = `Multimodal functionality is not enabled for use case: ${useCaseId}`;
            logger.error(errorMsg);
            metrics.addMetric(CloudWatchMetrics.MULTIMODAL_DISABLED_ERROR, MetricUnit.Count, 1);
            throw new Error(errorMsg);
        }

        logger.debug(`Multimodal capability validated for useCaseId: ${useCaseId}`);
    }
}
