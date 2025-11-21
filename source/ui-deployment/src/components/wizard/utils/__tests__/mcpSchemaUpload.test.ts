// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
// Updated test file

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MCPSchemaUploadHandler } from '../mcpSchemaUpload';
import { DEPLOYMENT_STATUS_NOTIFICATION, USECASE_TYPES } from '@/utils/constants';
import { uploadSchemaFiles } from '@/services/fetchSchemaUpload';

// Mock the upload service
vi.mock('@/services/fetchSchemaUpload', () => ({
    uploadSchemaFiles: vi.fn()
}));

describe('MCPSchemaUploadHandler', () => {
    const mockUploadSchemaFiles = vi.mocked(uploadSchemaFiles);
    const mockSetUseCaseDeployStatus = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('requiresSchemaUpload', () => {
        test('returns true for MCP Server use case type', () => {
            expect(MCPSchemaUploadHandler.requiresSchemaUpload(USECASE_TYPES.MCP_SERVER)).toBe(true);
        });

        test('returns false for other use case types', () => {
            expect(MCPSchemaUploadHandler.requiresSchemaUpload(USECASE_TYPES.TEXT)).toBe(false);
            expect(MCPSchemaUploadHandler.requiresSchemaUpload(USECASE_TYPES.AGENT)).toBe(false);
        });
    });

    describe('getFileCount', () => {
        test('returns 0 when no MCP server info', () => {
            const stepsInfo = {};
            expect(MCPSchemaUploadHandler.getFileCount(stepsInfo)).toBe(0);
        });

        test('returns 0 when no targets', () => {
            const stepsInfo = {
                mcpServer: {
                    targets: [],
                    inError: false
                }
            };
            expect(MCPSchemaUploadHandler.getFileCount(stepsInfo)).toBe(0);
        });

        test('returns count of files that need uploading', () => {
            const mockFile = new File(['test'], 'test.json', { type: 'application/json' });
            const stepsInfo = {
                mcpServer: {
                    targets: [
                        {
                            uploadedSchema: mockFile,
                            uploadedSchemaKey: undefined // Needs upload
                        },
                        {
                            uploadedSchema: null,
                            uploadedSchemaKey: undefined // No file to upload
                        },
                        {
                            uploadedSchema: mockFile,
                            uploadedSchemaKey: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json' // Already uploaded
                        }
                    ],
                    inError: false
                }
            };
            expect(MCPSchemaUploadHandler.getFileCount(stepsInfo)).toBe(1);
        });
    });

    describe('isSchemaUploadFailure', () => {
        test('returns true for schema upload failure status', () => {
            expect(MCPSchemaUploadHandler.isSchemaUploadFailure(DEPLOYMENT_STATUS_NOTIFICATION.SCHEMA_UPLOAD_FAILURE)).toBe(true);
        });

        test('returns false for other statuses', () => {
            expect(MCPSchemaUploadHandler.isSchemaUploadFailure(DEPLOYMENT_STATUS_NOTIFICATION.SUCCESS)).toBe(false);
            expect(MCPSchemaUploadHandler.isSchemaUploadFailure(DEPLOYMENT_STATUS_NOTIFICATION.PENDING)).toBe(false);
        });
    });

    describe('initializeNotifications and getNotifications', () => {
        test('initializes and retrieves notifications', () => {
            const mockNotifications = { addNotification: vi.fn() };
            MCPSchemaUploadHandler.initializeNotifications(mockNotifications);
            expect(MCPSchemaUploadHandler.getNotifications()).toBe(mockNotifications);
        });
    });

    describe('uploadAllSchemaFiles', () => {
        test('returns early when no MCP server info', async () => {
            const stepsInfo = {};
            await MCPSchemaUploadHandler.uploadAllSchemaFiles(stepsInfo, mockSetUseCaseDeployStatus);
            expect(mockUploadSchemaFiles).not.toHaveBeenCalled();
        });

        test('returns early when no targets', async () => {
            const stepsInfo = {
                mcpServer: {
                    targets: [],
                    inError: false
                }
            };
            await MCPSchemaUploadHandler.uploadAllSchemaFiles(stepsInfo, mockSetUseCaseDeployStatus);
            expect(mockUploadSchemaFiles).not.toHaveBeenCalled();
        });

        test('returns early when no files to upload', async () => {
            const stepsInfo = {
                mcpServer: {
                    targets: [
                        { uploadedSchema: null },
                        { uploadedSchema: undefined }
                    ],
                    inError: false
                }
            };
            await MCPSchemaUploadHandler.uploadAllSchemaFiles(stepsInfo, mockSetUseCaseDeployStatus);
            expect(mockUploadSchemaFiles).not.toHaveBeenCalled();
        });

        test('successfully uploads files and updates targets', async () => {
            const mockFile1 = new File(['test1'], 'test1.json', { type: 'application/json' });
            const mockFile2 = new File(['test2'], 'test2.json', { type: 'application/json' });

            const stepsInfo = {
                mcpServer: {
                    targets: [
                        {
                            uploadedSchema: mockFile1,
                            targetType: 'lambda',
                            uploadedSchemaKey: undefined,
                            uploadedSchemaFileName: undefined,
                            uploadFailed: false
                        },
                        {
                            uploadedSchema: mockFile2,
                            targetType: 'openapi',
                            uploadedSchemaKey: 'existing-key',
                            uploadedSchemaFileName: 'test2.json',
                            uploadFailed: false
                        }
                    ],
                    inError: false
                }
            };

            mockUploadSchemaFiles.mockResolvedValue({
                allSuccessful: true,
                successCount: 2,
                failureCount: 0,
                totalAttempts: 1,
                results: [
                    {
                        targetIndex: 0,
                        success: true,
                        schemaKey: 'new-schema-key-1',
                        fileName: 'test1.json',
                        error: null,
                        attempts: 1
                    },
                    {
                        targetIndex: 1,
                        success: true,
                        schemaKey: 'existing-key',
                        fileName: 'test2.json',
                        error: null,
                        attempts: 0,
                        skipped: true
                    }
                ]
            });

            await MCPSchemaUploadHandler.uploadAllSchemaFiles(stepsInfo, mockSetUseCaseDeployStatus);

            expect(mockSetUseCaseDeployStatus).toHaveBeenCalledWith(DEPLOYMENT_STATUS_NOTIFICATION.SCHEMA_UPLOAD_PENDING);
            expect(stepsInfo.mcpServer.targets[0].uploadedSchemaKey).toBe('new-schema-key-1');
            expect(stepsInfo.mcpServer.targets[0].uploadedSchemaFileName).toBe('test1.json');
            expect(stepsInfo.mcpServer.targets[0].uploadFailed).toBe(false);
            expect(stepsInfo.mcpServer.inError).toBe(false);
        });

        test('handles partial upload failures', async () => {
            const mockFile1 = new File(['test1'], 'test1.json', { type: 'application/json' });
            const mockFile2 = new File(['test2'], 'test2.json', { type: 'application/json' });

            const stepsInfo = {
                mcpServer: {
                    targets: [
                        {
                            uploadedSchema: mockFile1,
                            targetType: 'lambda',
                            uploadedSchemaKey: undefined,
                            uploadedSchemaFileName: undefined,
                            uploadFailed: false
                        },
                        {
                            uploadedSchema: mockFile2,
                            targetType: 'openapi',
                            uploadedSchemaKey: undefined,
                            uploadedSchemaFileName: undefined,
                            uploadFailed: false
                        }
                    ],
                    inError: false
                }
            };

            mockUploadSchemaFiles.mockResolvedValue({
                allSuccessful: false,
                successCount: 1,
                failureCount: 1,
                totalAttempts: 4,
                results: [
                    {
                        targetIndex: 0,
                        success: true,
                        schemaKey: 'new-schema-key-1',
                        fileName: 'test1.json',
                        error: null,
                        attempts: 1
                    },
                    {
                        targetIndex: 1,
                        success: false,
                        fileName: 'test2.json',
                        schemaKey: '',
                        error: 'Upload failed',
                        attempts: 3
                    }
                ]
            });

            await expect(
                MCPSchemaUploadHandler.uploadAllSchemaFiles(stepsInfo, mockSetUseCaseDeployStatus)
            ).rejects.toThrow('MCP schema file upload failed for: test2.json');

            expect(stepsInfo.mcpServer.targets[0].uploadedSchemaKey).toBe('new-schema-key-1');
            expect(stepsInfo.mcpServer.targets[0].uploadFailed).toBe(false);
            expect(stepsInfo.mcpServer.targets[1].uploadFailed).toBe(true);
            expect(stepsInfo.mcpServer.targets[1].uploadedSchemaKey).toBeUndefined();
            expect(stepsInfo.mcpServer.inError).toBe(true);
        });

        test('handles upload service errors', async () => {
            const mockFile = new File(['test'], 'test.json', { type: 'application/json' });

            const stepsInfo = {
                mcpServer: {
                    targets: [
                        {
                            uploadedSchema: mockFile,
                            targetType: 'lambda',
                            uploadedSchemaKey: undefined,
                            uploadedSchemaFileName: undefined,
                            uploadFailed: false
                        }
                    ],
                    inError: false
                }
            };

            const uploadError = new Error('Network error');
            mockUploadSchemaFiles.mockRejectedValue(uploadError);

            await expect(
                MCPSchemaUploadHandler.uploadAllSchemaFiles(stepsInfo, mockSetUseCaseDeployStatus)
            ).rejects.toThrow('Network error');

            expect(mockSetUseCaseDeployStatus).toHaveBeenCalledWith(DEPLOYMENT_STATUS_NOTIFICATION.SCHEMA_UPLOAD_PENDING);
            expect(mockSetUseCaseDeployStatus).toHaveBeenCalledWith(DEPLOYMENT_STATUS_NOTIFICATION.SCHEMA_UPLOAD_FAILURE);
        });
    });
});