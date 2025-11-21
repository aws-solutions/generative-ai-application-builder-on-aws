// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { S3Client } from '@aws-sdk/client-s3';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { APIGatewayEvent } from 'aws-lambda';
import { UploadSchemasCommand, ListMCPServersCommand } from '../../../model/commands/mcp-command';
import { UploadMCPTargetSchemaAdapter } from '../../../model/adapters/mcp-adapter';
import { ListUseCasesAdapter } from '../../../model/list-use-cases';
import { StorageManagement } from '../../../ddb/storage-management';
import { UseCaseConfigManagement } from '../../../ddb/use-case-config-management';
import { StackManagement } from '../../../cfn/stack-management';
import {
    GATEWAY_TARGET_TYPES,
    MCP_SCHEMA_UPLOAD_CONSTRAINTS,
    MCP_CONTENT_TYPES,
    UseCaseTypes,
    STRANDS_TOOLS_SSM_PARAM_ENV_VAR
} from '../../../utils/constants';

const { logger } = require('../../../power-tools-init');

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-presigned-post');
jest.mock('aws-node-user-agent-config', () => ({
    customAwsConfig: jest.fn().mockReturnValue({})
}));

jest.mock('../../../utils/utils', () => ({
    parseEventBody: jest.fn(),
    extractUserId: jest.fn(),
    generateUUID: jest.fn()
}));

jest.mock('../../../power-tools-init', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    },
    tracer: {
        getRootXrayTraceId: jest.fn().mockReturnValue('test-trace-id'),
        captureAWSv3Client: jest.fn(),
        captureMethod: () => () => {}
    }
}));

describe('UploadSchemasCommand', () => {
    let command: UploadSchemasCommand;
    let mockS3Client: jest.Mocked<S3Client>;
    let mockCreatePresignedPost: jest.MockedFunction<typeof createPresignedPost>;
    let mockParseEventBody: jest.Mock;
    let mockExtractUserId: jest.Mock;
    let mockGenerateUUID: jest.Mock;

    const mockEvent: APIGatewayEvent = {
        httpMethod: 'POST',
        resource: '/upload-schema',
        body: JSON.stringify({
            files: [
                {
                    schemaType: GATEWAY_TARGET_TYPES.OPEN_API,
                    fileName: 'my-api-schema.json'
                }
            ]
        }),
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/upload-schema',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {
            authorizer: {
                UserId: 'test-user-123'
            }
        } as any
    };

    let mockUploadMCPTargetSchemaAdapter: UploadMCPTargetSchemaAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        process.env.GAAB_DEPLOYMENTS_BUCKET = 'test-mcp-schemas-bucket';
        process.env.AWS_SDK_USER_AGENT = JSON.stringify({ customUserAgent: 'test-agent' });
        process.env._X_AMZN_TRACE_ID = 'test-trace-id';

        mockParseEventBody = require('../../../utils/utils').parseEventBody;
        mockParseEventBody.mockReturnValue({
            files: [
                {
                    schemaType: GATEWAY_TARGET_TYPES.OPEN_API,
                    fileName: 'my-api-schema.json'
                }
            ]
        });

        mockExtractUserId = jest.requireMock('../../../utils/utils').extractUserId;
        mockExtractUserId.mockReturnValue('test-user-123');

        mockGenerateUUID = jest.requireMock('../../../utils/utils').generateUUID;
        mockGenerateUUID.mockReturnValue('test-uuid-123');

        mockS3Client = new S3Client({}) as jest.Mocked<S3Client>;
        (S3Client as jest.Mock).mockImplementation(() => mockS3Client);

        // Mock createPresignedPost
        mockCreatePresignedPost = createPresignedPost as jest.MockedFunction<typeof createPresignedPost>;
        mockCreatePresignedPost.mockResolvedValue({
            url: 'https://test-bucket.s3.amazonaws.com/',
            fields: {
                key: 'mcp/openApi_schema_2024-01-15T10-30-45-123Z.json',
                'x-amz-meta-userid': 'test-user-123',
                'x-amz-meta-filename': 'my-api-schema.json',
                'x-amz-meta-fileextension': '.json',
                'Content-Type': MCP_CONTENT_TYPES.JSON,
                'tagging':
                    '<Tagging><TagSet><Tag><Key>schemaType</Key><Value>openApiSchema</Value></Tag><Tag><Key>uploadedBy</Key><Value>test-user-123</Value></Tag><Tag><Key>source</Key><Value>mcp-api</Value></Tag><Tag><Key>status</Key><Value>inactive</Value></Tag></TagSet></Tagging>'
            }
        });

        command = new UploadSchemasCommand();
        mockUploadMCPTargetSchemaAdapter = new UploadMCPTargetSchemaAdapter(mockEvent);
    });

    afterEach(() => {
        delete process.env.GAAB_DEPLOYMENTS_BUCKET;
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env._X_AMZN_TRACE_ID;
    });

    describe('UploadSchemasCommand backing the upload-schema endpoint', () => {
        it('should successfully generate presigned POST for valid upload schema operation', async () => {
            const result = await command.execute(mockUploadMCPTargetSchemaAdapter);

            expect(result).toEqual({
                uploads: [
                    {
                        uploadUrl: 'https://test-bucket.s3.amazonaws.com/',
                        formFields: {
                            key: 'mcp/openApi_schema_2024-01-15T10-30-45-123Z.json',
                            'x-amz-meta-userid': 'test-user-123',
                            'x-amz-meta-filename': 'my-api-schema.json',
                            'x-amz-meta-fileextension': '.json',
                            'Content-Type': MCP_CONTENT_TYPES.JSON,
                            'tagging':
                                '<Tagging><TagSet><Tag><Key>schemaType</Key><Value>openApiSchema</Value></Tag><Tag><Key>uploadedBy</Key><Value>test-user-123</Value></Tag><Tag><Key>source</Key><Value>mcp-api</Value></Tag><Tag><Key>status</Key><Value>inactive</Value></Tag></TagSet></Tagging>'
                        },
                        fileName: 'my-api-schema.json',
                        expiresIn: MCP_SCHEMA_UPLOAD_CONSTRAINTS.PRESIGNED_URL_EXPIRY_SECONDS,
                        createdAt: expect.any(String)
                    }
                ]
            });
        });

        it('should throw error for invalid operation type', async () => {
            const invalidOperation = {} as any;

            await expect(command.execute(invalidOperation)).rejects.toThrow(
                'UploadSchemasCommand only supports UploadMCPTargetSchemaAdapter operations'
            );
        });

        it('should handle S3 errors gracefully', async () => {
            mockCreatePresignedPost.mockRejectedValue(new Error('S3 service error'));

            await expect(command.execute(mockUploadMCPTargetSchemaAdapter)).rejects.toThrow('S3 service error');
        });

        it('should throw error for invalid file extension for schema type', async () => {
            // Mock an adapter with invalid extension for lambda schema type
            mockParseEventBody.mockReturnValue({
                files: [
                    {
                        schemaType: GATEWAY_TARGET_TYPES.LAMBDA,
                        fileName: 'schema.yaml' // Invalid for lambda
                    }
                ]
            });

            const invalidAdapter = new UploadMCPTargetSchemaAdapter(mockEvent);

            await expect(command.execute(invalidAdapter)).rejects.toThrow(
                "Invalid files[0] file extension '.yaml' for file 'schema.yaml' with schema type 'lambda'"
            );
        });
    });

    describe('S3 integration', () => {
        it('should generate presigned POST with proper S3 configuration and advanced validation', async () => {
            await command.execute(mockUploadMCPTargetSchemaAdapter);

            expect(mockCreatePresignedPost).toHaveBeenCalledWith(mockS3Client, {
                Bucket: 'test-mcp-schemas-bucket',
                Key: 'mcp/schemas/openApiSchema/test-uuid-123.json',
                Conditions: [
                    ['starts-with', '$key', 'mcp/schemas/openApiSchema/'],
                    [
                        'content-length-range',
                        MCP_SCHEMA_UPLOAD_CONSTRAINTS.MIN_FILE_SIZE_BYTES,
                        MCP_SCHEMA_UPLOAD_CONSTRAINTS.MAX_FILE_SIZE_BYTES
                    ],
                    ['eq', '$x-amz-meta-userid', 'test-user-123'],
                    ['eq', '$x-amz-meta-filename', 'my-api-schema.json'],
                    ['eq', '$x-amz-meta-fileextension', '.json'],
                    ['eq', '$Content-Type', MCP_CONTENT_TYPES.JSON],
                    [
                        'eq',
                        '$tagging',
                        '<Tagging><TagSet><Tag><Key>schemaType</Key><Value>openApiSchema</Value></Tag><Tag><Key>uploadedBy</Key><Value>test-user-123</Value></Tag><Tag><Key>source</Key><Value>mcp-api</Value></Tag><Tag><Key>status</Key><Value>inactive</Value></Tag></TagSet></Tagging>'
                    ]
                ],
                Fields: {
                    key: 'mcp/schemas/openApiSchema/test-uuid-123.json',
                    'x-amz-meta-userid': 'test-user-123',
                    'x-amz-meta-filename': 'my-api-schema.json',
                    'x-amz-meta-fileextension': '.json',
                    'Content-Type': MCP_CONTENT_TYPES.JSON,
                    'tagging':
                        '<Tagging><TagSet><Tag><Key>schemaType</Key><Value>openApiSchema</Value></Tag><Tag><Key>uploadedBy</Key><Value>test-user-123</Value></Tag><Tag><Key>source</Key><Value>mcp-api</Value></Tag><Tag><Key>status</Key><Value>inactive</Value></Tag></TagSet></Tagging>'
                },
                Expires: MCP_SCHEMA_UPLOAD_CONSTRAINTS.PRESIGNED_URL_EXPIRY_SECONDS
            });
        });
    });

    describe('response format', () => {
        it('should include upload constraints and enhanced metadata in response', async () => {
            const result = await command.execute(mockUploadMCPTargetSchemaAdapter);

            expect(result).toEqual(
                expect.objectContaining({
                    uploads: expect.arrayContaining([
                        expect.objectContaining({
                            uploadUrl: expect.any(String),
                            formFields: expect.any(Object),
                            fileName: expect.any(String),
                            expiresIn: MCP_SCHEMA_UPLOAD_CONSTRAINTS.PRESIGNED_URL_EXPIRY_SECONDS,
                            createdAt: expect.any(String)
                        })
                    ])
                })
            );
        });

        it('should include proper form fields for POST upload', async () => {
            const result = await command.execute(mockUploadMCPTargetSchemaAdapter);

            expect(result.uploads[0].formFields).toEqual(
                expect.objectContaining({
                    key: expect.any(String),
                    'x-amz-meta-userid': 'test-user-123',
                    'x-amz-meta-filename': 'my-api-schema.json',
                    'x-amz-meta-fileextension': '.json',
                    'Content-Type': MCP_CONTENT_TYPES.JSON,
                    'tagging': expect.stringContaining('<Tag><Key>schemaType</Key><Value>openApiSchema</Value></Tag>')
                })
            );
        });
    });
});

describe('ListMCPServersCommand', () => {
    let command: ListMCPServersCommand;
    let mockStorageMgmt: any;
    let mockUseCaseConfigMgmt: any;
    let mockStackMgmt: any;
    let mockSSMClient: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockStorageMgmt = {
            getAllCaseRecords: jest.fn()
        };

        mockUseCaseConfigMgmt = {
            getUseCaseConfigFromRecord: jest.fn()
        };

        mockStackMgmt = {
            getStackDetailsFromUseCaseRecord: jest.fn()
        };

        mockSSMClient = {
            send: jest.fn()
        };

        command = new ListMCPServersCommand();
        (command as any).storageMgmt = mockStorageMgmt;
        (command as any).useCaseConfigMgmt = mockUseCaseConfigMgmt;
        (command as any).stackMgmt = mockStackMgmt;
        (command as any).ssmClient = mockSSMClient;
    });

    describe('Empty results handling', () => {
        it('should return empty array when no use case records exist', async () => {
            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: []
            });

            const result = await command.execute({} as any);

            expect(result).toEqual({ mcpServers: [], strandsTools: [] });
            expect(mockStorageMgmt.getAllCaseRecords).toHaveBeenCalledTimes(1);
        });

        it('should return empty array when no MCP servers exist (only other use case types)', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'use-case-1',
                    Name: 'Chat Use Case',
                    UseCaseConfigRecordKey: 'config-key-1'
                },
                {
                    UseCaseId: 'use-case-2',
                    Name: 'Agent Use Case',
                    UseCaseConfigRecordKey: 'config-key-2'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord
                .mockResolvedValueOnce({ UseCaseType: 'Chat' })
                .mockResolvedValueOnce({ UseCaseType: 'AgentBuilder' });

            const result = await command.execute({} as any);

            expect(result).toEqual({ mcpServers: [], strandsTools: [] });
            expect(mockUseCaseConfigMgmt.getUseCaseConfigFromRecord).toHaveBeenCalledTimes(2);
        });

        it('should log debug message when no MCP servers are found', async () => {
            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: []
            });

            await command.execute({} as any);

            expect(logger.debug).toHaveBeenCalledWith('No MCP servers found, returning empty array');
        });
    });

    describe('Successful MCP server listing', () => {
        it('should return formatted list of MCP servers with ACTIVE status', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'mcp-1',
                    Name: 'WeatherAPI-MCP',
                    Description: 'MCP server for weather data',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                },
                {
                    UseCaseId: 'mcp-2',
                    Name: 'DatabaseTools-MCP',
                    UseCaseConfigRecordKey: 'config-key-2',
                    StackId: 'stack-2'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord
                .mockResolvedValueOnce({
                    UseCaseType: UseCaseTypes.MCP_SERVER,
                    UseCaseName: 'WeatherAPI-MCP',
                    MCPParams: {
                        GatewayParams: {
                            GatewayUrl: 'https://gateway-1.example.com'
                        }
                    }
                })
                .mockResolvedValueOnce({
                    UseCaseType: UseCaseTypes.MCP_SERVER,
                    UseCaseName: 'DatabaseTools-MCP',
                    MCPParams: {
                        RuntimeParams: {
                            RuntimeUrl: 'https://runtime-2.example.com'
                        }
                    }
                });

            mockStackMgmt.getStackDetailsFromUseCaseRecord
                .mockResolvedValueOnce({ status: 'CREATE_COMPLETE' })
                .mockResolvedValueOnce({ status: 'UPDATE_COMPLETE' });

            const result = await command.execute({} as any);

            expect(result.mcpServers).toHaveLength(2);
            expect(result.mcpServers[0]).toEqual({
                useCaseId: 'mcp-1',
                useCaseName: 'WeatherAPI-MCP',
                description: '',
                status: 'ACTIVE',
                url: 'https://gateway-1.example.com',
                type: 'gateway'
            });
            expect(result.mcpServers[1]).toEqual({
                useCaseId: 'mcp-2',
                useCaseName: 'DatabaseTools-MCP',
                description: '',
                status: 'ACTIVE',
                url: 'https://runtime-2.example.com',
                type: 'runtime'
            });
            expect(result.strandsTools).toEqual([]);
        });

        it('should filter out non-MCP server use cases', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'mcp-1',
                    Name: 'WeatherAPI-MCP',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                },
                {
                    UseCaseId: 'chat-1',
                    Name: 'Chat Use Case',
                    UseCaseConfigRecordKey: 'config-key-2',
                    StackId: 'stack-2'
                },
                {
                    UseCaseId: 'mcp-2',
                    Name: 'DatabaseTools-MCP',
                    UseCaseConfigRecordKey: 'config-key-3',
                    StackId: 'stack-3'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord
                .mockResolvedValueOnce({
                    UseCaseType: UseCaseTypes.MCP_SERVER,
                    UseCaseName: 'WeatherAPI-MCP',
                    MCPParams: {
                        GatewayParams: {
                            GatewayUrl: 'https://gateway-1.example.com'
                        }
                    }
                })
                .mockResolvedValueOnce({ UseCaseType: 'Chat' })
                .mockResolvedValueOnce({
                    UseCaseType: UseCaseTypes.MCP_SERVER,
                    UseCaseName: 'DatabaseTools-MCP',
                    MCPParams: {
                        RuntimeParams: {
                            RuntimeUrl: 'https://runtime-2.example.com'
                        }
                    }
                });

            mockStackMgmt.getStackDetailsFromUseCaseRecord
                .mockResolvedValueOnce({ status: 'CREATE_COMPLETE' })
                .mockResolvedValueOnce({ status: 'CREATE_COMPLETE' });

            const result = await command.execute({} as any);

            expect(result.mcpServers).toHaveLength(2);
            expect(result.mcpServers[0].useCaseId).toBe('mcp-1');
            expect(result.mcpServers[0].useCaseName).toBe('WeatherAPI-MCP');
            expect(result.mcpServers[1].useCaseId).toBe('mcp-2');
            expect(result.mcpServers[1].useCaseName).toBe('DatabaseTools-MCP');
        });

        it('should return INACTIVE status for servers in CREATE_IN_PROGRESS state', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'mcp-1',
                    Name: 'Creating-MCP',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'Creating-MCP',
                MCPParams: {
                    GatewayParams: {
                        GatewayUrl: 'https://gateway.example.com'
                    }
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'CREATE_IN_PROGRESS'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers[0].status).toBe('INACTIVE');
            expect(result.mcpServers[0].useCaseName).toBe('Creating-MCP');
        });

        it('should return INACTIVE status for servers in ROLLBACK state', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'mcp-1',
                    Name: 'Failed-MCP',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'Failed-MCP',
                MCPParams: {
                    RuntimeParams: {
                        RuntimeUrl: 'https://runtime.example.com'
                    }
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'ROLLBACK_COMPLETE'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers[0].status).toBe('INACTIVE');
            expect(result.mcpServers[0].useCaseName).toBe('Failed-MCP');
        });

        it('should handle stack status retrieval failure gracefully', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'mcp-1',
                    Name: 'MCP-With-Stack-Error',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'MCP-With-Stack-Error',
                MCPParams: {
                    GatewayParams: {
                        GatewayUrl: 'https://gateway.example.com'
                    }
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockRejectedValueOnce(new Error('Stack not found'));

            const result = await command.execute({} as any);

            expect(result.mcpServers[0].status).toBe('INACTIVE');
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Could not retrieve stack status for mcp-1')
            );
        });

        it('should use empty string as default when UseCaseName is missing', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'mcp-1',
                    Name: 'MCP-Without-Name',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                // UseCaseName is intentionally missing
                MCPParams: {
                    GatewayParams: {
                        GatewayUrl: 'https://gateway.example.com'
                    }
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'CREATE_COMPLETE'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers).toHaveLength(1);
            expect(result.mcpServers[0]).toEqual({
                useCaseId: 'mcp-1',
                useCaseName: '', // Should default to empty string
                description: '', // Should default to empty string when UseCaseName is missing
                status: 'ACTIVE',
                url: 'https://gateway.example.com',
                type: 'gateway'
            });
        });
    });

    describe('Error handling', () => {
        it('should exclude records with missing UseCaseConfigRecordKey', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'mcp-1',
                    Name: 'Valid MCP',
                    UseCaseConfigRecordKey: 'config-key-1'
                },
                {
                    UseCaseId: 'mcp-2',
                    Name: 'Invalid MCP',
                    UseCaseConfigRecordKey: undefined
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                MCPParams: {
                    GatewayParams: {
                        GatewayUrl: 'https://gateway.example.com'
                    }
                }
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers).toHaveLength(1);
            expect(logger.error).toHaveBeenCalledWith('UseCaseConfigRecordKey missing for record: mcp-2');
        });

        it('should exclude records where config retrieval fails', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'mcp-1',
                    Name: 'Valid MCP',
                    UseCaseConfigRecordKey: 'config-key-1'
                },
                {
                    UseCaseId: 'mcp-2',
                    Name: 'Failing MCP',
                    UseCaseConfigRecordKey: 'config-key-2'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord
                .mockResolvedValueOnce({
                    UseCaseType: UseCaseTypes.MCP_SERVER,
                    UseCaseName: 'Valid MCP',
                    MCPParams: {
                        GatewayParams: {
                            GatewayUrl: 'https://gateway.example.com'
                        }
                    }
                })
                .mockRejectedValueOnce(new Error('Config not found'));

            const result = await command.execute({} as any);

            expect(result.mcpServers).toHaveLength(1);
            expect(result.mcpServers[0].useCaseId).toBe('mcp-1');
            expect(result.mcpServers[0].useCaseName).toBe('Valid MCP');
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Error retrieving config for record mcp-2')
            );
        });

        it('should throw error when database read fails', async () => {
            mockStorageMgmt.getAllCaseRecords.mockRejectedValue(new Error('Database error'));

            await expect(command.execute({} as any)).rejects.toThrow('Database error');
        });
    });

    describe('SSM Parameter Store integration for Strands tools', () => {
        beforeEach(() => {
            // Setup default successful MCP server response
            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: []
            });
        });

        it('should successfully read and parse Strands tools from SSM parameter', async () => {
            const mockTools = [
                {
                    name: 'Calculator',
                    description: 'Perform mathematical calculations',
                    value: 'calculator',
                    category: 'Math',
                    isDefault: true
                },
                {
                    name: 'Current Time',
                    description: 'Get current date and time',
                    value: 'current_time',
                    category: 'Utilities',
                    isDefault: true
                }
            ];

            process.env.STRANDS_TOOLS_SSM_PARAM = '/gaab/test-stack/strands-tools';

            mockSSMClient.send.mockResolvedValue({
                Parameter: {
                    Value: JSON.stringify(mockTools)
                }
            });

            const result = await command.execute({} as any);

            expect(result).toEqual({
                mcpServers: [],
                strandsTools: mockTools
            });
            expect(mockSSMClient.send).toHaveBeenCalledTimes(1);
        });

        it('should return empty tools array when STRANDS_TOOLS_SSM_PARAM environment variable is not set', async () => {
            delete process.env.STRANDS_TOOLS_SSM_PARAM;

            const result = await command.execute({} as any);

            expect(result.strandsTools).toEqual([]);
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('STRANDS_TOOLS_SSM_PARAM environment variable not set')
            );
            expect(mockSSMClient.send).not.toHaveBeenCalled();
        });

        it('should handle ParameterNotFound error and return empty tools array', async () => {
            process.env.STRANDS_TOOLS_SSM_PARAM = '/gaab/test-stack/strands-tools';

            const parameterNotFoundError = new Error('Parameter not found');
            parameterNotFoundError.name = 'ParameterNotFound';
            mockSSMClient.send.mockRejectedValue(parameterNotFoundError);

            const result = await command.execute({} as any);

            expect(result.strandsTools).toEqual([]);
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('SSM parameter /gaab/test-stack/strands-tools not found')
            );
        });

        it('should handle AccessDeniedException error and return empty tools array', async () => {
            process.env.STRANDS_TOOLS_SSM_PARAM = '/gaab/test-stack/strands-tools';

            const accessDeniedError = new Error('Access denied');
            accessDeniedError.name = 'AccessDeniedException';
            mockSSMClient.send.mockRejectedValue(accessDeniedError);

            const result = await command.execute({} as any);

            expect(result.strandsTools).toEqual([]);
            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Insufficient IAM permissions to read SSM parameter')
            );
        });

        it('should handle invalid JSON error and return empty tools array', async () => {
            process.env.STRANDS_TOOLS_SSM_PARAM = '/gaab/test-stack/strands-tools';

            mockSSMClient.send.mockResolvedValue({
                Parameter: {
                    Value: 'invalid json {'
                }
            });

            const result = await command.execute({} as any);

            expect(result.strandsTools).toEqual([]);
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON in SSM parameter'));
        });

        it('should return empty tools array when SSM parameter has no value', async () => {
            process.env.STRANDS_TOOLS_SSM_PARAM = '/gaab/test-stack/strands-tools';

            mockSSMClient.send.mockResolvedValue({
                Parameter: {
                    Value: undefined
                }
            });

            const result = await command.execute({} as any);

            expect(result.strandsTools).toEqual([]);
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('SSM parameter /gaab/test-stack/strands-tools has no value')
            );
        });

        it('should return empty tools array when SSM parameter value is not an array', async () => {
            process.env.STRANDS_TOOLS_SSM_PARAM = '/gaab/test-stack/strands-tools';

            mockSSMClient.send.mockResolvedValue({
                Parameter: {
                    Value: JSON.stringify({ notAnArray: true })
                }
            });

            const result = await command.execute({} as any);

            expect(result.strandsTools).toEqual([]);
            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('SSM parameter /gaab/test-stack/strands-tools value is not an array')
            );
        });

        it('should handle unexpected errors and return empty tools array', async () => {
            process.env.STRANDS_TOOLS_SSM_PARAM = '/gaab/test-stack/strands-tools';

            const unexpectedError = new Error('Network timeout');
            mockSSMClient.send.mockRejectedValue(unexpectedError);

            const result = await command.execute({} as any);

            expect(result.strandsTools).toEqual([]);
            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Unexpected error reading SSM parameter')
            );
        });

        it('should include both mcpServers and strandsTools in response format', async () => {
            const mockTools = [
                {
                    name: 'Calculator',
                    description: 'Perform calculations',
                    value: 'calculator',
                    isDefault: true
                }
            ];

            const mockRecords = [
                {
                    UseCaseId: 'mcp-1',
                    Name: 'Test MCP',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            process.env.STRANDS_TOOLS_SSM_PARAM = '/gaab/test-stack/strands-tools';

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValue({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'test-mcp',
                MCPParams: {
                    GatewayParams: {
                        GatewayUrl: 'https://gateway.example.com'
                    }
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValue({
                status: 'CREATE_COMPLETE'
            });

            mockSSMClient.send.mockResolvedValue({
                Parameter: {
                    Value: JSON.stringify(mockTools)
                }
            });

            const result = await command.execute({} as any);

            expect(result).toEqual({
                mcpServers: [
                    {
                        useCaseId: 'mcp-1',
                        useCaseName: 'test-mcp',
                        description: '',
                        status: 'ACTIVE',
                        url: 'https://gateway.example.com',
                        type: 'gateway'
                    }
                ],
                strandsTools: mockTools
            });
        });

        it('should log successful tool retrieval with count', async () => {
            const mockTools = [
                { name: 'Tool1', description: 'Desc1', value: 'tool1', isDefault: true },
                { name: 'Tool2', description: 'Desc2', value: 'tool2', isDefault: false },
                { name: 'Tool3', description: 'Desc3', value: 'tool3', isDefault: true }
            ];

            process.env.STRANDS_TOOLS_SSM_PARAM = '/gaab/test-stack/strands-tools';

            mockSSMClient.send.mockResolvedValue({
                Parameter: {
                    Value: JSON.stringify(mockTools)
                }
            });

            await command.execute({} as any);

            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Successfully loaded 3 Strands tools from SSM parameter')
            );
        });
    });

    describe('Enhanced MCP server details with URL and type', () => {
        it('should return Gateway MCP server with url and type', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'gateway-mcp-1',
                    UseCaseName: 'mock-mcp-gateway',
                    Name: 'Gateway MCP Server',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'gateway-mcp-server',
                MCPParams: {
                    GatewayParams: {
                        GatewayUrl: 'https://gateway-123.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp'
                    }
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'CREATE_COMPLETE'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers).toHaveLength(1);
            expect(result.mcpServers[0]).toEqual({
                useCaseId: 'gateway-mcp-1',
                useCaseName: 'gateway-mcp-server',
                description: '',
                status: 'ACTIVE',
                url: 'https://gateway-123.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                type: 'gateway'
            });
        });

        it('should return Runtime MCP server with url and type', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'runtime-mcp-1',
                    Name: 'Runtime MCP Server',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'runtime-mcp-server',
                MCPParams: {
                    RuntimeParams: {
                        RuntimeUrl:
                            'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Fruntime-123/invocations?qualifier=DEFAULT'
                    }
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'UPDATE_COMPLETE'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers).toHaveLength(1);
            expect(result.mcpServers[0]).toEqual({
                useCaseId: 'runtime-mcp-1',
                useCaseName: 'runtime-mcp-server',
                description: '',
                status: 'ACTIVE',
                url: 'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Fruntime-123/invocations?qualifier=DEFAULT',
                type: 'runtime'
            });
        });

        it('should handle missing Gateway URL with empty string default', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'gateway-mcp-1',
                    Name: 'Gateway MCP Server',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'gateway-mcp-no-url',
                MCPParams: {
                    GatewayParams: {}
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'CREATE_COMPLETE'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers).toHaveLength(1);
            expect(result.mcpServers[0].url).toBe('');
            expect(result.mcpServers[0].type).toBe('gateway');
            expect(logger.warn).toHaveBeenCalledWith('GatewayUrl missing for use case gateway-mcp-1');
        });

        it('should handle missing Runtime URL with empty string default', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'runtime-mcp-1',
                    Name: 'Runtime MCP Server',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'runtime-mcp-no-url',
                MCPParams: {
                    RuntimeParams: {}
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'CREATE_COMPLETE'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers).toHaveLength(1);
            expect(result.mcpServers[0].url).toBe('');
            expect(result.mcpServers[0].type).toBe('runtime');
            expect(logger.warn).toHaveBeenCalledWith('RuntimeUrl missing for use case runtime-mcp-1');
        });

        it('should construct Runtime URL from RuntimeArn when RuntimeUrl is missing', async () => {
            process.env.AWS_REGION = 'us-west-2';
            const mockRecords = [
                {
                    UseCaseId: 'runtime-mcp-1',
                    Name: 'Runtime MCP Server',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'runtime-mcp-with-arn',
                MCPParams: {
                    RuntimeParams: {
                        RuntimeArn: 'arn:aws:bedrock-agentcore:us-west-2:123456789012:runtime/runtime-123'
                    }
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'CREATE_COMPLETE'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers).toHaveLength(1);
            expect(result.mcpServers[0].url).toBe(
                'https://bedrock-agentcore.us-west-2.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-west-2%3A123456789012%3Aruntime%2Fruntime-123/invocations?qualifier=DEFAULT'
            );
            expect(result.mcpServers[0].type).toBe('runtime');
        });

        it('should exclude servers with both Gateway and Runtime params', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'invalid-mcp-1',
                    Name: 'Invalid MCP Server',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'invalid-mcp-both-params',
                MCPParams: {
                    GatewayParams: {
                        GatewayUrl: 'https://gateway.example.com'
                    },
                    RuntimeParams: {
                        RuntimeUrl: 'https://runtime.example.com'
                    }
                }
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers).toHaveLength(0);
            expect(logger.error).toHaveBeenCalledWith(
                'Invalid MCP configuration: both GatewayParams and RuntimeParams present for use case invalid-mcp-1'
            );
        });

        it('should exclude servers with neither Gateway nor Runtime params', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'invalid-mcp-1',
                    Name: 'Invalid MCP Server',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'invalid-mcp-no-params',
                MCPParams: {}
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers).toHaveLength(0);
            expect(logger.error).toHaveBeenCalledWith(
                'Invalid MCP configuration: neither GatewayParams nor RuntimeParams present for use case invalid-mcp-1'
            );
        });

        it('should determine ACTIVE status for CREATE_COMPLETE', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'mcp-1',
                    Name: 'MCP Server',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'mcp-create-complete',
                MCPParams: {
                    GatewayParams: {
                        GatewayUrl: 'https://gateway.example.com'
                    }
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'CREATE_COMPLETE'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers[0].status).toBe('ACTIVE');
        });

        it('should determine ACTIVE status for UPDATE_COMPLETE', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'mcp-1',
                    Name: 'MCP Server',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'mcp-update-complete',
                MCPParams: {
                    GatewayParams: {
                        GatewayUrl: 'https://gateway.example.com'
                    }
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'UPDATE_COMPLETE'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers[0].status).toBe('ACTIVE');
        });

        it('should determine INACTIVE status for other stack statuses', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'mcp-1',
                    Name: 'MCP Server',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'mcp-delete-in-progress',
                MCPParams: {
                    GatewayParams: {
                        GatewayUrl: 'https://gateway.example.com'
                    }
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'DELETE_IN_PROGRESS'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers[0].status).toBe('INACTIVE');
        });

        it('should continue processing when one server fails', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'mcp-1',
                    Name: 'Valid MCP Server',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                },
                {
                    UseCaseId: 'mcp-2',
                    Name: 'Failing MCP Server',
                    UseCaseConfigRecordKey: 'config-key-2',
                    StackId: 'stack-2'
                },
                {
                    UseCaseId: 'mcp-3',
                    Name: 'Another Valid MCP Server',
                    UseCaseConfigRecordKey: 'config-key-3',
                    StackId: 'stack-3'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord
                .mockResolvedValueOnce({
                    UseCaseType: UseCaseTypes.MCP_SERVER,
                    MCPParams: {
                        GatewayParams: {
                            GatewayUrl: 'https://gateway-1.example.com'
                        }
                    }
                })
                .mockResolvedValueOnce({
                    UseCaseType: UseCaseTypes.MCP_SERVER,
                    MCPParams: {}
                })
                .mockResolvedValueOnce({
                    UseCaseType: UseCaseTypes.MCP_SERVER,
                    MCPParams: {
                        RuntimeParams: {
                            RuntimeUrl: 'https://runtime-3.example.com'
                        }
                    }
                });

            mockStackMgmt.getStackDetailsFromUseCaseRecord
                .mockResolvedValueOnce({ status: 'CREATE_COMPLETE' })
                .mockResolvedValueOnce({ status: 'CREATE_COMPLETE' });

            const result = await command.execute({} as any);

            expect(result.mcpServers).toHaveLength(2);
            expect(result.mcpServers[0].useCaseId).toBe('mcp-1');
            expect(result.mcpServers[1].useCaseId).toBe('mcp-3');
            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error extracting MCP server details for mcp-2')
            );
        });

        it('should include Strands tools in response alongside MCP servers', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'mcp-1',
                    Name: 'MCP Server',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            const mockTools = [
                {
                    name: 'Calculator',
                    description: 'Perform calculations',
                    value: 'calculator',
                    isDefault: true
                }
            ];

            process.env.STRANDS_TOOLS_SSM_PARAM = '/gaab/test-stack/strands-tools';

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'mcp-server',
                MCPParams: {
                    GatewayParams: {
                        GatewayUrl: 'https://gateway.example.com'
                    }
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'CREATE_COMPLETE'
            });

            mockSSMClient.send.mockResolvedValue({
                Parameter: {
                    Value: JSON.stringify(mockTools)
                }
            });

            const result = await command.execute({} as any);

            expect(result).toEqual({
                mcpServers: [
                    {
                        useCaseId: 'mcp-1',
                        useCaseName: 'mcp-server',
                        description: '',
                        status: 'ACTIVE',
                        url: 'https://gateway.example.com',
                        type: 'gateway'
                    }
                ],
                strandsTools: mockTools
            });
        });

        it('should log info message with total server count', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'mcp-1',
                    Name: 'MCP Server 1',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                },
                {
                    UseCaseId: 'mcp-2',
                    Name: 'MCP Server 2',
                    UseCaseConfigRecordKey: 'config-key-2',
                    StackId: 'stack-2'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord
                .mockResolvedValueOnce({
                    UseCaseType: UseCaseTypes.MCP_SERVER,
                    MCPParams: {
                        GatewayParams: {
                            GatewayUrl: 'https://gateway-1.example.com'
                        }
                    }
                })
                .mockResolvedValueOnce({
                    UseCaseType: UseCaseTypes.MCP_SERVER,
                    MCPParams: {
                        RuntimeParams: {
                            RuntimeUrl: 'https://runtime-2.example.com'
                        }
                    }
                });

            mockStackMgmt.getStackDetailsFromUseCaseRecord
                .mockResolvedValueOnce({ status: 'CREATE_COMPLETE' })
                .mockResolvedValueOnce({ status: 'CREATE_COMPLETE' });

            await command.execute({} as any);

            expect(logger.info).toHaveBeenCalledWith('Found 2 MCP servers');
        });
    });

    describe('URL extraction and validation', () => {
        it('should extract Gateway URL correctly from config', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'gateway-mcp',
                    UseCaseName: 'Gateway',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'gateway-mcp-server',
                MCPParams: {
                    GatewayParams: {
                        GatewayUrl: 'https://gateway-abc123.example.com/mcp'
                    }
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'CREATE_COMPLETE'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers[0]).toEqual({
                useCaseId: 'gateway-mcp',
                useCaseName: 'gateway-mcp-server',
                description: '',
                status: 'ACTIVE',
                url: 'https://gateway-abc123.example.com/mcp',
                type: 'gateway'
            });
        });

        it('should extract Runtime URL correctly from config', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'runtime-mcp',
                    Name: 'Runtime MCP Server',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'runtime-mcp-server',
                MCPParams: {
                    RuntimeParams: {
                        RuntimeUrl:
                            'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Fruntime-id/invocations?qualifier=DEFAULT'
                    }
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'UPDATE_COMPLETE'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers[0]).toEqual({
                useCaseId: 'runtime-mcp',
                useCaseName: 'runtime-mcp-server',
                description: '',
                status: 'ACTIVE',
                url: 'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Fruntime-id/invocations?qualifier=DEFAULT',
                type: 'runtime'
            });
        });

        it('should use empty string default for missing Gateway URL', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'gateway-no-url',
                    UseCaseName: 'gateway',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'gateway-no-url',
                MCPParams: {
                    GatewayParams: {
                        // GatewayUrl is missing
                    }
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'CREATE_COMPLETE'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers[0]).toEqual({
                useCaseId: 'gateway-no-url',
                useCaseName: 'gateway-no-url',
                description: '',
                status: 'ACTIVE',
                url: '',
                type: 'gateway'
            });
            expect(logger.warn).toHaveBeenCalledWith('GatewayUrl missing for use case gateway-no-url');
        });

        it('should use empty string default for missing Runtime URL', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'runtime-no-url',
                    UseCaseName: 'Runtime MCP Without URL',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'runtime-no-url',
                MCPParams: {
                    RuntimeParams: {
                        // RuntimeUrl is missing
                    }
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'CREATE_COMPLETE'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers[0]).toEqual({
                useCaseId: 'runtime-no-url',
                useCaseName: 'runtime-no-url',
                description: '',
                status: 'ACTIVE',
                url: '',
                type: 'runtime'
            });
            expect(logger.warn).toHaveBeenCalledWith('RuntimeUrl missing for use case runtime-no-url');
        });
    });

    describe('Invalid configuration handling', () => {
        it('should exclude servers with both Gateway and Runtime params', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'valid-mcp',
                    Name: 'Valid MCP',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                },
                {
                    UseCaseId: 'invalid-both',
                    Name: 'Invalid MCP with both params',
                    UseCaseConfigRecordKey: 'config-key-2',
                    StackId: 'stack-2'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord
                .mockResolvedValueOnce({
                    UseCaseType: UseCaseTypes.MCP_SERVER,
                    MCPParams: {
                        GatewayParams: {
                            GatewayUrl: 'https://gateway.example.com'
                        }
                    }
                })
                .mockResolvedValueOnce({
                    UseCaseType: UseCaseTypes.MCP_SERVER,
                    MCPParams: {
                        GatewayParams: {
                            GatewayUrl: 'https://gateway.example.com'
                        },
                        RuntimeParams: {
                            RuntimeUrl: 'https://runtime.example.com'
                        }
                    }
                });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'CREATE_COMPLETE'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers).toHaveLength(1);
            expect(result.mcpServers[0].useCaseId).toBe('valid-mcp');
            expect(logger.error).toHaveBeenCalledWith(
                'Invalid MCP configuration: both GatewayParams and RuntimeParams present for use case invalid-both'
            );
        });

        it('should exclude servers with neither Gateway nor Runtime params', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'valid-mcp',
                    Name: 'Valid MCP',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                },
                {
                    UseCaseId: 'invalid-neither',
                    Name: 'Invalid MCP with no params',
                    UseCaseConfigRecordKey: 'config-key-2',
                    StackId: 'stack-2'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord
                .mockResolvedValueOnce({
                    UseCaseType: UseCaseTypes.MCP_SERVER,
                    MCPParams: {
                        GatewayParams: {
                            GatewayUrl: 'https://gateway.example.com'
                        }
                    }
                })
                .mockResolvedValueOnce({
                    UseCaseType: UseCaseTypes.MCP_SERVER,
                    MCPParams: {
                        // Neither GatewayParams nor RuntimeParams
                    }
                });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'CREATE_COMPLETE'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers).toHaveLength(1);
            expect(result.mcpServers[0].useCaseId).toBe('valid-mcp');
            expect(logger.error).toHaveBeenCalledWith(
                'Invalid MCP configuration: neither GatewayParams nor RuntimeParams present for use case invalid-neither'
            );
        });

        it('should continue processing other servers when one server has invalid config', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'mcp-1',
                    Name: 'Valid MCP 1',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                },
                {
                    UseCaseId: 'mcp-invalid',
                    Name: 'Invalid MCP',
                    UseCaseConfigRecordKey: 'config-key-2',
                    StackId: 'stack-2'
                },
                {
                    UseCaseId: 'mcp-2',
                    Name: 'Valid MCP 2',
                    UseCaseConfigRecordKey: 'config-key-3',
                    StackId: 'stack-3'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord
                .mockResolvedValueOnce({
                    UseCaseType: UseCaseTypes.MCP_SERVER,
                    MCPParams: {
                        GatewayParams: {
                            GatewayUrl: 'https://gateway-1.example.com'
                        }
                    }
                })
                .mockResolvedValueOnce({
                    UseCaseType: UseCaseTypes.MCP_SERVER,
                    MCPParams: {
                        // Invalid: neither params
                    }
                })
                .mockResolvedValueOnce({
                    UseCaseType: UseCaseTypes.MCP_SERVER,
                    MCPParams: {
                        RuntimeParams: {
                            RuntimeUrl: 'https://runtime-2.example.com'
                        }
                    }
                });

            mockStackMgmt.getStackDetailsFromUseCaseRecord
                .mockResolvedValueOnce({ status: 'CREATE_COMPLETE' })
                .mockResolvedValueOnce({ status: 'CREATE_COMPLETE' });

            const result = await command.execute({} as any);

            expect(result.mcpServers).toHaveLength(2);
            expect(result.mcpServers[0].useCaseId).toBe('mcp-1');
            expect(result.mcpServers[1].useCaseId).toBe('mcp-2');
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid MCP configuration'));
        });
    });

    describe('Status determination', () => {
        it('should return ACTIVE status for CREATE_COMPLETE', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'mcp-1',
                    Name: 'MCP Server',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'mcp-status-create-complete',
                MCPParams: {
                    GatewayParams: {
                        GatewayUrl: 'https://gateway.example.com'
                    }
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'CREATE_COMPLETE'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers[0].status).toBe('ACTIVE');
        });

        it('should return ACTIVE status for UPDATE_COMPLETE', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'mcp-1',
                    Name: 'MCP Server',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'mcp-status-update-complete',
                MCPParams: {
                    GatewayParams: {
                        GatewayUrl: 'https://gateway.example.com'
                    }
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'UPDATE_COMPLETE'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers[0].status).toBe('ACTIVE');
        });

        it('should return INACTIVE status for DELETE_COMPLETE', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'mcp-1',
                    Name: 'MCP Server',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'mcp-status-delete-complete',
                MCPParams: {
                    GatewayParams: {
                        GatewayUrl: 'https://gateway.example.com'
                    }
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'DELETE_COMPLETE'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers[0].status).toBe('INACTIVE');
        });

        it('should return INACTIVE status for UPDATE_ROLLBACK_COMPLETE', async () => {
            const mockRecords = [
                {
                    UseCaseId: 'mcp-1',
                    Name: 'MCP Server',
                    UseCaseConfigRecordKey: 'config-key-1',
                    StackId: 'stack-1'
                }
            ];

            mockStorageMgmt.getAllCaseRecords.mockResolvedValue({
                useCaseRecords: mockRecords
            });

            mockUseCaseConfigMgmt.getUseCaseConfigFromRecord.mockResolvedValueOnce({
                UseCaseType: UseCaseTypes.MCP_SERVER,
                UseCaseName: 'mcp-status-rollback-complete',
                MCPParams: {
                    RuntimeParams: {
                        RuntimeUrl: 'https://runtime.example.com'
                    }
                }
            });

            mockStackMgmt.getStackDetailsFromUseCaseRecord.mockResolvedValueOnce({
                status: 'UPDATE_ROLLBACK_COMPLETE'
            });

            const result = await command.execute({} as any);

            expect(result.mcpServers[0].status).toBe('INACTIVE');
        });
    });
});
