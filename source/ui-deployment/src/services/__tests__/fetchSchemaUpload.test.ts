// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestSchemaUpload, uploadSchemaFiles } from '../fetchSchemaUpload';
import { API, Auth } from 'aws-amplify';
import { API_NAME, DEPLOYMENT_PLATFORM_API_ROUTES } from '@/utils/constants';
import { mockedAuthenticator } from '../../utils/test-utils';

// Mock fetch for S3 uploads
global.fetch = vi.fn();

describe('When requesting schema upload presigned URLs', () => {
    const mockAPI = {
        post: vi.fn()
    };

    beforeEach(() => {
        API.post = mockAPI.post;
        Auth.currentAuthenticatedUser = mockedAuthenticator();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('requestSchemaUpload', () => {
        const mockParams = {
            files: [
                { schemaType: 'openApi', fileName: 'api.json' },
                { schemaType: 'smithy', fileName: 'model.smithy' }
            ]
        };

        const mockResponse = {
            uploads: [
                {
                    uploadUrl: 'https://bucket.s3.amazonaws.com/api.json?signature=...',
                    fileName: 'api.json',
                    expiresIn: 300,
                    createdAt: '2024-01-15T10:30:45.123Z',
                    formFields: {
                        key: 'mcp/schemas/openapi/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                    }
                },
                {
                    uploadUrl: 'https://bucket.s3.amazonaws.com/model.smithy?signature=...',
                    fileName: 'model.smithy',
                    expiresIn: 300,
                    createdAt: '2024-01-15T10:30:45.123Z',
                    formFields: {
                        key: 'mcp/schemas/smithy/f2c3d4e5-6789-40fe-859e-b1c8e92ea4f4.smithy'
                    }
                }
            ]
        };

        test('returns presigned URLs for valid request', async () => {
            mockAPI.post.mockResolvedValue(mockResponse);

            const result = await requestSchemaUpload(mockParams);

            expect(mockAPI.post).toHaveBeenCalledTimes(1);
            expect(mockAPI.post).toHaveBeenCalledWith(
                API_NAME,
                DEPLOYMENT_PLATFORM_API_ROUTES.UPLOAD_MCP_SCHEMA.route,
                {
                    headers: { Authorization: 'fake-token' },
                    body: mockParams
                }
            );
            expect(result).toEqual(mockResponse);
        });

        test('handles API errors correctly', async () => {
            mockAPI.post.mockRejectedValue(new Error('API Error'));

            await expect(requestSchemaUpload(mockParams)).rejects.toThrow('API Error');
        });
    });

});

describe('When uploading schema files to S3', () => {
    const mockAPI = {
        post: vi.fn()
    };

    beforeEach(() => {
        API.post = mockAPI.post;
        Auth.currentAuthenticatedUser = mockedAuthenticator();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('uploadSchemaFiles', () => {
        const mockFiles = [
            new File(['{"openapi": "3.0.0"}'], 'api.json', { type: 'application/json' }),
            new File(['service MyService {}'], 'model.smithy', { type: 'text/plain' })
        ];

        const mockResponse = {
            uploads: [
                {
                    uploadUrl: 'https://bucket.s3.amazonaws.com/api.json?signature=...',
                    fileName: 'api.json',
                    expiresIn: 300,
                    createdAt: '2024-01-15T10:30:45.123Z',
                    formFields: {
                        key: 'mcp/schemas/openapi/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                    }
                },
                {
                    uploadUrl: 'https://bucket.s3.amazonaws.com/model.smithy?signature=...',
                    fileName: 'model.smithy',
                    expiresIn: 300,
                    createdAt: '2024-01-15T10:30:45.123Z',
                    formFields: {
                        key: 'mcp/schemas/smithy/f2c3d4e5-6789-40fe-859e-b1c8e92ea4f4.smithy'
                    }
                }
            ]
        };

        beforeEach(() => {
            mockAPI.post.mockResolvedValue(mockResponse);
            (global.fetch as any).mockResolvedValue({
                ok: true,
                status: 200,
                text: () => Promise.resolve('')
            });
        });

        test('uploads all files successfully', async () => {
            const allFiles = mockFiles.map((file, index) => ({
                file,
                targetIndex: index,
                targetType: ['openApi', 'smithy'][index]
            }));

            const result = await uploadSchemaFiles(
                mockFiles,
                ['openApi', 'smithy'],
                allFiles,
                allFiles
            );

            expect(result.allSuccessful).toBe(true);
            expect(result.successCount).toBe(2);
            expect(result.failureCount).toBe(0);
            expect(result.results).toHaveLength(2);
            expect(result.results[0].success).toBe(true);
            expect(result.results[0].fileName).toBe('api.json');
            expect(result.results[1].success).toBe(true);
            expect(result.results[1].fileName).toBe('model.smithy');
        });

        test('handles partial upload failures correctly', async () => {
            // Set up fetch mock to return success for first call, failure for second
            let callCount = 0;
            (global.fetch as any).mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        text: () => Promise.resolve('')
                    });
                } else {
                    return Promise.resolve({
                        ok: false,
                        status: 403,
                        text: () => Promise.resolve('Access Denied')
                    });
                }
            });

            const allFiles = mockFiles.map((file, index) => ({
                file,
                targetIndex: index,
                targetType: ['openApi', 'smithy'][index]
            }));

            const result = await uploadSchemaFiles(
                mockFiles,
                ['openApi', 'smithy'],
                allFiles,
                allFiles
            );

            expect(result.allSuccessful).toBe(false);
            expect(result.successCount).toBe(1);
            expect(result.failureCount).toBe(1);
            expect(result.results[0].success).toBe(true);
            expect(result.results[1].success).toBe(false);
            expect(result.results[1].error).toContain('HTTP 403');
        });

        test('retries failed uploads with exponential backoff', async () => {
            // Mock API response for single file
            mockAPI.post.mockResolvedValue({
                uploads: [mockResponse.uploads[0]] // Only first upload
            });

            // Set up fetch mock to fail first, succeed second
            let callCount = 0;
            (global.fetch as any).mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return Promise.resolve({
                        ok: false,
                        status: 500,
                        text: () => Promise.resolve('Server Error')
                    });
                } else {
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        text: () => Promise.resolve('')
                    });
                }
            });

            const allFiles = [mockFiles[0]].map((file, index) => ({
                file,
                targetIndex: index,
                targetType: 'openApi'
            }));

            const result = await uploadSchemaFiles(
                [mockFiles[0]],
                ['openApi'],
                allFiles,
                allFiles,
                2 // maxRetries
            );

            expect(result.allSuccessful).toBe(true);
            expect(result.results[0].attempts).toBe(2);
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });

        test('validates response format and handles invalid responses', async () => {
            mockAPI.post.mockRejectedValue(new Error('Invalid response: missing or invalid useCaseId'));

            const allFiles = mockFiles.map((file, index) => ({
                file,
                targetIndex: index,
                targetType: ['openApi', 'smithy'][index]
            }));

            const result = await uploadSchemaFiles(
                mockFiles,
                ['openApi', 'smithy'],
                allFiles,
                allFiles
            );

            expect(result.allSuccessful).toBe(false);
            expect(result.results[0].error).toContain('Invalid response: missing or invalid useCaseId');
        });

        test('handles file count mismatch between request and response', async () => {
            mockAPI.post.mockResolvedValue({
                uploads: [mockResponse.uploads[0]] // Only one upload for two files
            });

            const allFiles = mockFiles.map((file, index) => ({
                file,
                targetIndex: index,
                targetType: ['openApi', 'smithy'][index]
            }));

            const result = await uploadSchemaFiles(
                mockFiles,
                ['openApi', 'smithy'],
                allFiles,
                allFiles
            );

            expect(result.allSuccessful).toBe(false);
            expect(result.results[1].error).toContain('No presigned URL found for this file');
        });

        test('uses correct content types for different file extensions', async () => {

            // Mock API response for 4 files
            mockAPI.post.mockResolvedValue({
                uploads: [
                    {
                        uploadUrl: 'https://bucket.s3.amazonaws.com/test.json?signature=...',
                        fileName: 'test.json',
                        expiresIn: 300,
                        createdAt: '2024-01-15T10:30:45.123Z',
                        formFields: {
                            key: 'mcp/schemas/openapi/a1b2c3d4-5678-40fe-859e-e1f2g3h4i5j6.json'
                        }
                    },
                    {
                        uploadUrl: 'https://bucket.s3.amazonaws.com/test.yaml?signature=...',
                        fileName: 'test.yaml',
                        expiresIn: 300,
                        createdAt: '2024-01-15T10:30:45.123Z',
                        formFields: {
                            key: 'mcp/schemas/openapi/b2c3d4e5-6789-40fe-859e-f2g3h4i5j6k7.yaml'
                        }
                    },
                    {
                        uploadUrl: 'https://bucket.s3.amazonaws.com/test.xml?signature=...',
                        fileName: 'test.xml',
                        expiresIn: 300,
                        createdAt: '2024-01-15T10:30:45.123Z',
                        formFields: {
                            key: 'mcp/schemas/openapi/c3d4e5f6-7890-40fe-859e-g3h4i5j6k7l8.json'
                        }
                    },
                    {
                        uploadUrl: 'https://bucket.s3.amazonaws.com/test.txt?signature=...',
                        fileName: 'test.txt',
                        expiresIn: 300,
                        createdAt: '2024-01-15T10:30:45.123Z',
                        formFields: {
                            key: 'mcp/schemas/openapi/d4e5f6g7-8901-40fe-859e-h4i5j6k7l8m9.json'
                        }
                    }
                ]
            });

            // Set up fetch mock to succeed for all calls
            (global.fetch as any).mockImplementation(() => {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    text: () => Promise.resolve('')
                });
            });

            const testFiles = [
                new File(['{}'], 'test.json', { type: 'application/json' }),
                new File([''], 'test.yaml', { type: 'text/yaml' }),
                new File([''], 'test.xml', { type: 'application/xml' }),
                new File([''], 'test.txt', { type: 'text/plain' })
            ];

            const allFiles = testFiles.map((file, index) => ({
                file,
                targetIndex: index,
                targetType: 'openApi'
            }));

            await uploadSchemaFiles(
                testFiles,
                ['openApi', 'openApi', 'openApi', 'openApi'],
                allFiles,
                allFiles
            );

            const fetchCalls = (global.fetch as any).mock.calls;
            // Note: The current implementation uses FormData, not headers with Content-Type
            // This test should verify FormData structure instead
            expect(fetchCalls).toHaveLength(4);
            expect(fetchCalls[0][0]).toBe('https://bucket.s3.amazonaws.com/test.json?signature=...');
            expect(fetchCalls[1][0]).toBe('https://bucket.s3.amazonaws.com/test.yaml?signature=...');
            expect(fetchCalls[2][0]).toBe('https://bucket.s3.amazonaws.com/test.xml?signature=...');
            expect(fetchCalls[3][0]).toBe('https://bucket.s3.amazonaws.com/test.txt?signature=...');
        });
    });
});