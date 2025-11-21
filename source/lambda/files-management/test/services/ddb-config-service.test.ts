// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

jest.mock('aws-node-user-agent-config', () => ({
    customAwsConfig: jest.fn(() => ({ region: 'us-east-1' }))
}));

import { DdbConfigService } from '../../services/ddb-config-service';
import { AWSClientManager } from 'aws-sdk-lib';
import { marshall } from '@aws-sdk/util-dynamodb';

// Mock the dependencies
jest.mock('../../power-tools-init', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn()
    },
    tracer: {
        captureMethod: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
        captureAWSv3Client: jest.fn((client) => client)
    }
}));

const mockDynamoClient = {
    send: jest.fn()
};

describe('DdbConfigService', () => {
    let ddbConfigService: DdbConfigService;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.AWS_SDK_USER_AGENT = '{ "customUserAgent": "AWSSOLUTION/SO0084/v1.0.0" }';
        process.env.AWS_REGION = 'us-east-1';
        jest.spyOn(AWSClientManager, 'getServiceClient').mockReturnValue(mockDynamoClient as any);

        // Set up environment variables
        process.env.USE_CASE_CONFIG_TABLE_NAME = 'test-llm-config-table';
        process.env.USE_CASES_TABLE_NAME = 'test-use-cases-table';

        ddbConfigService = new DdbConfigService();
    });

    afterEach(() => {
        delete process.env.USE_CASE_CONFIG_TABLE_NAME;
        delete process.env.USE_CASES_TABLE_NAME;
    });

    describe('fetchUseCaseMultimodalityConfig', () => {
        const useCaseRecordKey = 'test-record-key';

        it('should return true when multimodal is enabled', async () => {
            const mockItem = {
                config: {
                    LlmParams: {
                        MultimodalParams: {
                            MultimodalEnabled: true
                        }
                    }
                }
            };

            mockDynamoClient.send.mockResolvedValue({
                Item: marshall(mockItem)
            });

            const result = await ddbConfigService.fetchUseCaseMultimodalityConfig(useCaseRecordKey);

            expect(result).toBe(true);
            expect(mockDynamoClient.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.objectContaining({
                        TableName: 'test-llm-config-table',
                        Key: marshall({ key: useCaseRecordKey }),
                        ProjectionExpression: 'config.LlmParams.MultimodalParams'
                    })
                })
            );
        });

        it('should return false when multimodal is disabled', async () => {
            const mockItem = {
                config: {
                    LlmParams: {
                        MultimodalParams: {
                            MultimodalEnabled: false
                        }
                    }
                }
            };

            mockDynamoClient.send.mockResolvedValue({
                Item: marshall(mockItem)
            });

            const result = await ddbConfigService.fetchUseCaseMultimodalityConfig(useCaseRecordKey);

            expect(result).toBe(false);
        });

        it('should return false when multimodal params are missing', async () => {
            const mockItem = {
                config: {
                    LlmParams: {}
                }
            };

            mockDynamoClient.send.mockResolvedValue({
                Item: marshall(mockItem)
            });

            const result = await ddbConfigService.fetchUseCaseMultimodalityConfig(useCaseRecordKey);

            expect(result).toBe(false);
        });

        it('should throw error when item is not found', async () => {
            mockDynamoClient.send.mockResolvedValue({
                Item: undefined
            });

            await expect(ddbConfigService.fetchUseCaseMultimodalityConfig(useCaseRecordKey)).rejects.toThrow(
                'Failed due to unexpected error.'
            );
        });

        it('should throw error when DynamoDB operation fails', async () => {
            mockDynamoClient.send.mockRejectedValue(new Error('DynamoDB error'));

            await expect(ddbConfigService.fetchUseCaseMultimodalityConfig(useCaseRecordKey)).rejects.toThrow(
                'Failed due to unexpected error.'
            );
        });
    });

    describe('fetchUseCaseConfigRecordKey', () => {
        const useCaseId = 'test-use-case-id';

        it('should return use case config record key successfully', async () => {
            const mockItem = {
                UseCaseConfigRecordKey: 'test-config-key'
            };

            mockDynamoClient.send.mockResolvedValue({
                Item: marshall(mockItem)
            });

            const result = await ddbConfigService.fetchUseCaseConfigRecordKey(useCaseId);

            expect(result).toBe('test-config-key');
            expect(mockDynamoClient.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.objectContaining({
                        TableName: 'test-use-cases-table',
                        Key: marshall({ UseCaseId: useCaseId }),
                        ProjectionExpression: 'UseCaseConfigRecordKey'
                    })
                })
            );
        });

        it('should throw error when use case config is not found', async () => {
            mockDynamoClient.send.mockResolvedValue({
                Item: undefined
            });

            await expect(ddbConfigService.fetchUseCaseConfigRecordKey(useCaseId)).rejects.toThrow(
                'Failed due to unexpected error.'
            );
        });

        it('should throw error when UseCaseConfigRecordKey is missing', async () => {
            const mockItem = {
                SomeOtherField: 'value'
            };

            mockDynamoClient.send.mockResolvedValue({
                Item: marshall(mockItem)
            });

            await expect(ddbConfigService.fetchUseCaseConfigRecordKey(useCaseId)).rejects.toThrow(
                'Failed due to unexpected error.'
            );
        });

        it('should throw error when DynamoDB operation fails', async () => {
            mockDynamoClient.send.mockRejectedValue(new Error('DynamoDB error'));

            await expect(ddbConfigService.fetchUseCaseConfigRecordKey(useCaseId)).rejects.toThrow(
                'Failed due to unexpected error.'
            );
        });
    });
});
