// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { FileValidator } from '../../validators/file-validator';
import { MultimodalCache } from '../../utils/multimodal-cache';
import {
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    USE_CASES_TABLE_NAME_ENV_VAR,
    MULTIMODAL_ENABLED_ENV_VAR,
    CloudWatchMetrics
} from '../../utils/constants';
import { DdbConfigService } from '../../services/ddb-config-service';
import { metrics } from '../../power-tools-init';

jest.mock('../../services/ddb-config-service', () => ({
    DdbConfigService: jest.fn().mockImplementation(() => ({
        fetchUseCaseConfigRecordKey: jest.fn(),
        fetchUseCaseMultimodalityConfig: jest.fn()
    }))
}));
jest.mock('../../utils/multimodal-cache', () => ({
    MultimodalCache: {
        get: jest.fn(),
        set: jest.fn(),
        cleanupExpiredEntries: jest.fn()
    }
}));
jest.mock('../../power-tools-init', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    },
    tracer: {
        captureAWSv3Client: jest.fn(),
        captureMethod: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor
    },
    metrics: {
        addMetric: jest.fn()
    }
}));

describe('FileValidator', () => {
    let fileValidator: FileValidator;
    let mockDdbConfigService: jest.Mocked<any>;
    let mockMultimodalCache: jest.Mocked<typeof MultimodalCache>;

    beforeEach(() => {
        process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'test-use-case-config-table';
        process.env[USE_CASES_TABLE_NAME_ENV_VAR] = 'test-use-cases-table';

        mockMultimodalCache = MultimodalCache as jest.Mocked<typeof MultimodalCache>;

        mockDdbConfigService = {
            fetchUseCaseConfigRecordKey: jest.fn(),
            fetchUseCaseMultimodalityConfig: jest.fn()
        };

        (DdbConfigService as jest.MockedClass<typeof DdbConfigService>).mockImplementation(() => mockDdbConfigService);

        fileValidator = new FileValidator();
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR];
        delete process.env[USE_CASES_TABLE_NAME_ENV_VAR];
        delete process.env[MULTIMODAL_ENABLED_ENV_VAR];
    });

    describe('validateMultimodalCapability', () => {
        const testUseCaseId = 'test-use-case-123';

        beforeEach(() => {
            // Reset cache mocks
            mockMultimodalCache.get.mockReturnValue(undefined);
            mockMultimodalCache.set.mockClear();
            mockMultimodalCache.cleanupExpiredEntries.mockClear();
        });

        describe('cache behavior', () => {
            it('should return early if cache has enabled=true', async () => {
                mockMultimodalCache.get.mockReturnValue(true);

                await expect(fileValidator.validateMultimodalCapability(testUseCaseId)).resolves.not.toThrow();

                expect(mockMultimodalCache.get).toHaveBeenCalledWith(testUseCaseId);
                expect(mockDdbConfigService.fetchUseCaseConfigRecordKey).not.toHaveBeenCalled();
            });

            it('should throw error if cache has enabled=false', async () => {
                mockMultimodalCache.get.mockReturnValue(false);

                await expect(fileValidator.validateMultimodalCapability(testUseCaseId)).rejects.toThrow(
                    `Multimodal functionality is not enabled for use case: ${testUseCaseId}`
                );

                expect(mockMultimodalCache.get).toHaveBeenCalledWith(testUseCaseId);
                expect(mockDdbConfigService.fetchUseCaseConfigRecordKey).not.toHaveBeenCalled();
            });

            it('should cleanup expired entries when cache miss', async () => {
                mockMultimodalCache.get.mockReturnValue(undefined);
                process.env.MULTIMODAL_ENABLED = 'true';

                await fileValidator.validateMultimodalCapability(testUseCaseId);

                expect(mockMultimodalCache.cleanupExpiredEntries).toHaveBeenCalled();
            });
        });

        describe('environment variable validation', () => {
            it('should pass when MULTIMODAL_ENABLED env var is true', async () => {
                mockMultimodalCache.get.mockReturnValue(undefined); // Cache miss
                process.env[MULTIMODAL_ENABLED_ENV_VAR] = 'true';

                await expect(fileValidator.validateMultimodalCapability(testUseCaseId)).resolves.not.toThrow();

                expect(mockMultimodalCache.set).toHaveBeenCalledWith(testUseCaseId, true);
            });

            it('should throw error when MULTIMODAL_ENABLED env var is false', async () => {
                mockMultimodalCache.get.mockReturnValue(undefined); // Cache miss
                process.env[MULTIMODAL_ENABLED_ENV_VAR] = 'false';

                await expect(fileValidator.validateMultimodalCapability(testUseCaseId)).rejects.toThrow(
                    `Multimodal functionality is not enabled for use case: ${testUseCaseId}`
                );

                expect(mockMultimodalCache.set).toHaveBeenCalledWith(testUseCaseId, false);
            });
        });

        describe('database validation', () => {
            beforeEach(() => {
                mockMultimodalCache.get.mockReturnValue(undefined); // Cache miss
                delete process.env[MULTIMODAL_ENABLED_ENV_VAR]; // Force database lookup
                process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'test-use-case-config-table';
            });

            it('should validate through database when env var not set', async () => {
                mockDdbConfigService.fetchUseCaseConfigRecordKey.mockResolvedValue('test-record-key');
                mockDdbConfigService.fetchUseCaseMultimodalityConfig.mockResolvedValue(true);

                await expect(fileValidator.validateMultimodalCapability(testUseCaseId)).resolves.not.toThrow();

                expect(mockDdbConfigService.fetchUseCaseConfigRecordKey).toHaveBeenCalledWith(testUseCaseId);
                expect(mockDdbConfigService.fetchUseCaseMultimodalityConfig).toHaveBeenCalledWith('test-record-key');
                expect(mockMultimodalCache.set).toHaveBeenCalledWith(testUseCaseId, true);
            });

            it('should throw error when use case config not found', async () => {
                mockDdbConfigService.fetchUseCaseConfigRecordKey.mockRejectedValue(
                    new Error(`Use case configuration not found for useCaseId: ${testUseCaseId}`)
                );

                await expect(fileValidator.validateMultimodalCapability(testUseCaseId)).rejects.toThrow(
                    `Use case configuration not found for useCaseId: ${testUseCaseId}`
                );
            });

            it('should throw error when multimodal is disabled in database', async () => {
                mockDdbConfigService.fetchUseCaseConfigRecordKey.mockResolvedValue('test-record-key');
                mockDdbConfigService.fetchUseCaseMultimodalityConfig.mockResolvedValue(false);

                await expect(fileValidator.validateMultimodalCapability(testUseCaseId)).rejects.toThrow(
                    `Multimodal functionality is not enabled for use case: ${testUseCaseId}`
                );

                expect(mockMultimodalCache.set).toHaveBeenCalledWith(testUseCaseId, false);
            });

            it('should throw error when neither env vars are available', async () => {
                // Create a new FileValidator instance without the USE_CASES_TABLE_NAME_ENV_VAR
                delete process.env[USE_CASES_TABLE_NAME_ENV_VAR];
                const newFileValidator = new FileValidator();

                await expect(newFileValidator.validateMultimodalCapability(testUseCaseId)).rejects.toThrow(
                    `Neither ${MULTIMODAL_ENABLED_ENV_VAR} nor ${USE_CASES_TABLE_NAME_ENV_VAR} environment variables are available`
                );
            });

            it('should handle database errors gracefully', async () => {
                const error = new Error('DynamoDB connection failed');
                mockDdbConfigService.fetchUseCaseConfigRecordKey.mockRejectedValue(error);

                await expect(fileValidator.validateMultimodalCapability(testUseCaseId)).rejects.toThrow(
                    'Multimodal validation failed: DynamoDB connection failed'
                );
            });
        });

        describe('metrics', () => {
            it('should add metric when multimodal is disabled', async () => {
                mockMultimodalCache.get.mockReturnValue(false);

                await expect(fileValidator.validateMultimodalCapability(testUseCaseId)).rejects.toThrow();

                expect(metrics.addMetric).toHaveBeenCalledWith(CloudWatchMetrics.MULTIMODAL_DISABLED_ERROR, 'Count', 1);
            });

            it('should add metric when env var is false', async () => {
                mockMultimodalCache.get.mockReturnValue(undefined);
                process.env[MULTIMODAL_ENABLED_ENV_VAR] = 'false';

                await expect(fileValidator.validateMultimodalCapability(testUseCaseId)).rejects.toThrow();

                expect(metrics.addMetric).toHaveBeenCalledWith(CloudWatchMetrics.MULTIMODAL_DISABLED_ERROR, 'Count', 1);
            });
        });
    });
});
