// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { updateFilesMetadataHandler, handler } from '../index';
import { MetadataValidator } from '../utils/metadata-validator';
import { EventBridgeProcessor } from '../utils/eventbridge-processor';
import { FileValidator } from '../utils/file-validator';
import { logger } from '../power-tools-init';
interface MockEvent {
    source: string;
    'detail-type': string;
    time: string;
    detail: {
        bucket: {
            name: string;
        };
        object: {
            key: string;
            size?: number;
        };
    };
}

const MOCK_USE_CASE_ID = 'useCase1';
const MOCK_USER_ID = '11111111-1111-1111-1111-111111111111';
const MOCK_CONVERSATION_ID = '22222222-2222-2222-2222-222222222222';
const MOCK_MESSAGE_ID = '33333333-3333-3333-3333-333333333333';
const MOCK_FILE_NAME = 'test-file.jpg';
const MOCK_OBJECT_KEY = `${MOCK_USE_CASE_ID}/${MOCK_USER_ID}/${MOCK_CONVERSATION_ID}/${MOCK_MESSAGE_ID}/${MOCK_FILE_NAME}`;

const MIME_TYPES: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    pdf: 'application/pdf',
    txt: 'text/plain'
};

function createMockEvent(overrides: Partial<MockEvent> = {}): MockEvent {
    const defaultEvent: MockEvent = {
        source: 'aws.s3',
        'detail-type': 'Object Created',
        time: '2023-01-01T00:00:00Z',
        detail: {
            bucket: {
                name: 'test-bucket'
            },
            object: {
                key: MOCK_OBJECT_KEY,
                size: 1024
            }
        }
    };

    return {
        ...defaultEvent,
        ...overrides,
        detail: {
            bucket: {
                ...defaultEvent.detail.bucket,
                ...overrides.detail?.bucket
            },
            object: {
                ...defaultEvent.detail.object,
                ...overrides.detail?.object
            }
        }
    };
}

jest.mock('../power-tools-init', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    },
    tracer: {
        getRootXrayTraceId: jest.fn().mockReturnValue('test-trace-id'),
        getSegment: jest.fn().mockReturnValue({}),
        captureAWSv3Client: jest.fn(),
        captureMethod: jest
            .fn()
            .mockImplementation(
                () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor
            )
    },
    metrics: {
        publishStoredMetrics: jest.fn(),
        addMetric: jest.fn()
    }
}));

// Mock the classes
jest.mock('../utils/eventbridge-processor');
jest.mock('../utils/metadata-validator');
jest.mock('../utils/file-validator');

const MockedEventBridgeProcessor = EventBridgeProcessor as jest.MockedClass<typeof EventBridgeProcessor>;
const MockedMetadataValidator = MetadataValidator as jest.MockedClass<typeof MetadataValidator>;
const MockedFileValidator = FileValidator as jest.MockedClass<typeof FileValidator>;

jest.mock('../utils/utils', () => ({
    checkEnv: jest.fn(),
    handleLambdaError: jest.fn(),
    extractContentTypeFromFileName: jest.fn((fileName: string) => {
        const extension = fileName.split('.').pop()?.toLowerCase() || '';
        return MIME_TYPES[extension] || 'application/octet-stream';
    }),
    extractFileExtension: jest.fn((fileName: string) => {
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
            return 'unknown';
        }
        return fileName.substring(lastDotIndex + 1).toLowerCase();
    })
}));

describe('Files Metadata Lambda', () => {
    beforeAll(() => {
        process.env.MULTIMODAL_METADATA_TABLE_NAME = 'test-table';
        process.env.MULTIMODAL_DATA_BUCKET = 'test-bucket';
        process.env.AWS_SDK_USER_AGENT = JSON.stringify({
            customUserAgent: [['AWSSOLUTION/SO0276/v0.0.0']]
        });
    });

    afterAll(() => {
        delete process.env.MULTIMODAL_METADATA_TABLE_NAME;
        delete process.env.MULTIMODAL_DATA_BUCKET;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockEvent = createMockEvent();

    it('should successfully process EventBridge event with valid metadata', async () => {
        const mockValidateMetadata = jest.fn().mockResolvedValue({
            objectKey: MOCK_OBJECT_KEY,
            isValid: true,
            originalFileName: 'test-file.jpg'
        });
        const mockValidateFile = jest.fn().mockResolvedValue({
            isValid: true,
            validationErrors: ''
        });
        const mockProcessEvent = jest.fn().mockResolvedValue({
            success: true,
            fileKey: MOCK_OBJECT_KEY,
            fileName: 'test-file.jpg'
        });

        MockedMetadataValidator.mockImplementation(
            () =>
                ({
                    validateMetadata: mockValidateMetadata
                }) as any
        );

        MockedFileValidator.mockImplementation(
            () =>
                ({
                    validateFile: mockValidateFile
                }) as any
        );

        MockedEventBridgeProcessor.mockImplementation(
            () =>
                ({
                    processEvent: mockProcessEvent
                }) as any
        );

        await expect(updateFilesMetadataHandler(mockEvent as any)).resolves.not.toThrow();

        expect(mockValidateMetadata).toHaveBeenCalledWith('test-bucket', MOCK_OBJECT_KEY);

        expect(mockValidateFile).toHaveBeenCalledWith('test-bucket', MOCK_OBJECT_KEY);

        expect(mockProcessEvent).toHaveBeenCalledWith(
            mockEvent,
            expect.objectContaining({
                isValid: true,
                originalFileName: 'test-file.jpg'
            })
        );
    });

    it('should successfully process EventBridge event with invalid metadata', async () => {
        const mockValidateMetadata = jest.fn().mockResolvedValue({
            objectKey: MOCK_OBJECT_KEY,
            isValid: false,
            error: 'Missing required metadata',
            originalFileName: 'test-file.jpg'
        });
        const mockValidateFile = jest.fn().mockResolvedValue({
            isValid: true,
            validationErrors: ''
        });
        const mockProcessEvent = jest.fn().mockResolvedValue({
            success: true,
            fileKey: MOCK_OBJECT_KEY,
            fileName: 'test-file.jpg'
        });

        MockedMetadataValidator.mockImplementation(
            () =>
                ({
                    validateMetadata: mockValidateMetadata
                }) as any
        );

        MockedFileValidator.mockImplementation(
            () =>
                ({
                    validateFile: mockValidateFile
                }) as any
        );

        MockedEventBridgeProcessor.mockImplementation(
            () =>
                ({
                    processEvent: mockProcessEvent
                }) as any
        );

        await expect(updateFilesMetadataHandler(mockEvent as any)).resolves.not.toThrow();

        expect(mockValidateMetadata).toHaveBeenCalledWith('test-bucket', MOCK_OBJECT_KEY);

        expect(mockProcessEvent).toHaveBeenCalledWith(
            mockEvent,
            expect.objectContaining({
                isValid: false,
                error: 'Missing required metadata',
                originalFileName: 'test-file.jpg'
            })
        );

        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Metadata validation failed - proceeding with invalid status')
        );
    });

    it('should throw error when event processing fails', async () => {
        const mockValidateMetadata = jest.fn().mockResolvedValue({
            objectKey: MOCK_OBJECT_KEY,
            isValid: true,
            originalFileName: 'test-file.jpg'
        });
        const mockValidateFile = jest.fn().mockResolvedValue({
            isValid: true,
            validationErrors: ''
        });
        const mockProcessEvent = jest.fn().mockResolvedValue({
            success: false,
            fileKey: MOCK_OBJECT_KEY,
            fileName: 'test-file.jpg',
            error: 'Processing failed'
        });

        MockedMetadataValidator.mockImplementation(
            () =>
                ({
                    validateMetadata: mockValidateMetadata
                }) as any
        );

        MockedFileValidator.mockImplementation(
            () =>
                ({
                    validateFile: mockValidateFile
                }) as any
        );

        MockedEventBridgeProcessor.mockImplementation(
            () =>
                ({
                    processEvent: mockProcessEvent
                }) as any
        );

        await expect(updateFilesMetadataHandler(mockEvent as any)).rejects.toThrow(
            'Failed to process event: Processing failed'
        );
    });

    it('should throw error when event detail is missing', async () => {
        const eventWithoutDetail = {
            source: 'aws.s3',
            'detail-type': 'Object Created',
            time: '2023-01-01T00:00:00Z',
            detail: null
        };

        await expect(updateFilesMetadataHandler(eventWithoutDetail as any)).rejects.toThrow(
            'Missing event detail in EventBridge event'
        );
    });

    it('should throw error when S3 object information is missing', async () => {
        const eventWithoutObjectKey = createMockEvent({
            detail: {
                bucket: { name: 'test-bucket' },
                object: { key: undefined as any }
            }
        });

        await expect(updateFilesMetadataHandler(eventWithoutObjectKey as any)).rejects.toThrow(
            'Missing required S3 object information in EventBridge event'
        );
    });

    it('should throw error when validation fails with system error', async () => {
        MockedMetadataValidator.mockImplementation(
            () =>
                ({
                    validateMetadata: jest.fn().mockRejectedValue(new Error('S3 API error'))
                }) as any
        );

        await expect(updateFilesMetadataHandler(mockEvent as any)).rejects.toThrow('S3 API error');
    });

    it('should export handler', () => {
        expect(handler).toBeDefined();
        expect(typeof handler).toBe('function');
    });
});

describe('Integration Tests - Orchestration Flow', () => {
    beforeAll(() => {
        process.env.MULTIMODAL_METADATA_TABLE_NAME = 'test-table';
        process.env.MULTIMODAL_DATA_BUCKET = 'test-bucket';
    });

    afterAll(() => {
        delete process.env.MULTIMODAL_METADATA_TABLE_NAME;
        delete process.env.MULTIMODAL_DATA_BUCKET;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should orchestrate validation-first flow correctly', async () => {
        const mockValidateMetadata = jest.fn().mockResolvedValue({
            objectKey: MOCK_OBJECT_KEY,
            isValid: true,
            originalFileName: 'test-file.jpg'
        });
        const mockValidateFile = jest.fn().mockResolvedValue({
            isValid: true,
            validationErrors: ''
        });
        const mockProcessEvent = jest.fn().mockResolvedValue({
            success: true,
            fileKey: MOCK_OBJECT_KEY,
            fileName: 'test-file.jpg'
        });

        MockedMetadataValidator.mockImplementation(
            () =>
                ({
                    validateMetadata: mockValidateMetadata
                }) as any
        );

        MockedFileValidator.mockImplementation(
            () =>
                ({
                    validateFile: mockValidateFile
                }) as any
        );

        MockedEventBridgeProcessor.mockImplementation(
            () =>
                ({
                    processEvent: mockProcessEvent
                }) as any
        );

        const testEvent = createMockEvent();
        await updateFilesMetadataHandler(testEvent as any);

        expect(mockValidateMetadata).toHaveBeenCalled();
        expect(mockValidateFile).toHaveBeenCalled();
        expect(mockProcessEvent).toHaveBeenCalled();

        expect(mockValidateMetadata).toHaveBeenCalledWith('test-bucket', MOCK_OBJECT_KEY);
        expect(mockValidateFile).toHaveBeenCalledWith('test-bucket', MOCK_OBJECT_KEY);
        expect(mockProcessEvent).toHaveBeenCalledWith(
            testEvent,
            expect.objectContaining({
                isValid: true,
                originalFileName: 'test-file.jpg'
            })
        );
    });

    it('should handle validation failure gracefully and continue processing', async () => {
        const mockValidateMetadata = jest.fn().mockResolvedValue({
            objectKey: MOCK_OBJECT_KEY,
            isValid: false,
            error: 'Security violation detected',
            originalFileName: 'test-file.jpg'
        });
        const mockValidateFile = jest.fn().mockResolvedValue({
            isValid: true,
            validationErrors: ''
        });
        const mockProcessEvent = jest.fn().mockResolvedValue({
            success: true,
            fileKey: MOCK_OBJECT_KEY,
            fileName: 'test-file.jpg'
        });

        MockedMetadataValidator.mockImplementation(
            () =>
                ({
                    validateMetadata: mockValidateMetadata
                }) as any
        );

        MockedFileValidator.mockImplementation(
            () =>
                ({
                    validateFile: mockValidateFile
                }) as any
        );

        MockedEventBridgeProcessor.mockImplementation(
            () =>
                ({
                    processEvent: mockProcessEvent
                }) as any
        );

        const testEvent = createMockEvent();
        await updateFilesMetadataHandler(testEvent as any);

        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Metadata validation failed - proceeding with invalid status')
        );

        expect(mockProcessEvent).toHaveBeenCalledWith(
            testEvent,
            expect.objectContaining({
                isValid: false,
                error: 'Security violation detected',
                originalFileName: 'test-file.jpg'
            })
        );
    });

    it('should handle successful processing with valid metadata', async () => {
        const mockValidateMetadata = jest.fn().mockResolvedValue({
            objectKey: MOCK_OBJECT_KEY,
            isValid: true,
            originalFileName: 'test-file.jpg'
        });
        const mockValidateFile = jest.fn().mockResolvedValue({
            isValid: true,
            validationErrors: ''
        });
        const mockProcessEvent = jest.fn().mockResolvedValue({
            success: true,
            fileKey: MOCK_OBJECT_KEY,
            fileName: 'test-file.jpg'
        });

        MockedMetadataValidator.mockImplementation(
            () =>
                ({
                    validateMetadata: mockValidateMetadata
                }) as any
        );

        MockedFileValidator.mockImplementation(
            () =>
                ({
                    validateFile: mockValidateFile
                }) as any
        );

        MockedEventBridgeProcessor.mockImplementation(
            () =>
                ({
                    processEvent: mockProcessEvent
                }) as any
        );

        await updateFilesMetadataHandler(createMockEvent() as any);

        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Successfully processed event for file'));
    });

    it('should handle successful processing with invalid metadata', async () => {
        const mockValidateMetadata = jest.fn().mockResolvedValue({
            objectKey: MOCK_OBJECT_KEY,
            isValid: false,
            error: 'Missing metadata tag',
            originalFileName: 'test-file.jpg'
        });
        const mockValidateFile = jest.fn().mockResolvedValue({
            isValid: true,
            validationErrors: ''
        });
        const mockProcessEvent = jest.fn().mockResolvedValue({
            success: true,
            fileKey: MOCK_OBJECT_KEY,
            fileName: 'test-file.jpg'
        });

        MockedMetadataValidator.mockImplementation(
            () =>
                ({
                    validateMetadata: mockValidateMetadata
                }) as any
        );

        MockedFileValidator.mockImplementation(
            () =>
                ({
                    validateFile: mockValidateFile
                }) as any
        );

        MockedEventBridgeProcessor.mockImplementation(
            () =>
                ({
                    processEvent: mockProcessEvent
                }) as any
        );

        await updateFilesMetadataHandler(createMockEvent() as any);

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('marked as invalid due to validation failure')
        );
    });

    it('should handle processing failure and log appropriately', async () => {
        const mockValidateMetadata = jest.fn().mockResolvedValue({
            objectKey: MOCK_OBJECT_KEY,
            isValid: true,
            originalFileName: 'test-file.jpg'
        });
        const mockValidateFile = jest.fn().mockResolvedValue({
            isValid: true,
            validationErrors: ''
        });
        const mockProcessEvent = jest.fn().mockResolvedValue({
            success: false,
            fileKey: MOCK_OBJECT_KEY,
            fileName: 'test-file.jpg',
            error: 'DynamoDB update failed'
        });

        MockedMetadataValidator.mockImplementation(
            () =>
                ({
                    validateMetadata: mockValidateMetadata
                }) as any
        );

        MockedFileValidator.mockImplementation(
            () =>
                ({
                    validateFile: mockValidateFile
                }) as any
        );

        MockedEventBridgeProcessor.mockImplementation(
            () =>
                ({
                    processEvent: mockProcessEvent
                }) as any
        );

        await expect(updateFilesMetadataHandler(createMockEvent() as any)).rejects.toThrow(
            'Failed to process event: DynamoDB update failed'
        );

        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to process event for file'));
    });

    it('should maintain backward compatibility with error response format', async () => {
        const mockValidateMetadata = jest.fn().mockResolvedValue({
            objectKey: MOCK_OBJECT_KEY,
            isValid: true,
            originalFileName: 'test-file.jpg'
        });
        const mockValidateFile = jest.fn().mockResolvedValue({
            isValid: true,
            validationErrors: ''
        });
        const mockProcessEvent = jest.fn().mockResolvedValue({
            success: false,
            fileKey: MOCK_OBJECT_KEY,
            fileName: 'test-file.jpg',
            error: 'Specific error message'
        });

        MockedMetadataValidator.mockImplementation(
            () =>
                ({
                    validateMetadata: mockValidateMetadata
                }) as any
        );

        MockedFileValidator.mockImplementation(
            () =>
                ({
                    validateFile: mockValidateFile
                }) as any
        );

        MockedEventBridgeProcessor.mockImplementation(
            () =>
                ({
                    processEvent: mockProcessEvent
                }) as any
        );

        await expect(updateFilesMetadataHandler(createMockEvent() as any)).rejects.toThrow(
            'Failed to process event: Specific error message'
        );
    });
});
