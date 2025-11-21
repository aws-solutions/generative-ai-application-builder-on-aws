// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

jest.mock('aws-node-user-agent-config', () => ({
    customAwsConfig: jest.fn(() => ({ region: 'us-east-1' }))
}));

import { SchemaUploadValidator, McpOperationsValidator } from '../../../model/validators/mcp-validator';
import { GATEWAY_TARGET_TYPES, MCP_CONTENT_TYPES, McpOperationTypes, UseCaseTypes, MODEL_INFO_TABLE_NAME_ENV_VAR, USE_CASE_CONFIG_TABLE_NAME_ENV_VAR, CfnParameterKeys } from '../../../utils/constants';
import { TargetParams } from '../../../model/types';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { StorageManagement } from '../../../ddb/storage-management';
import { UseCaseConfigManagement } from '../../../ddb/use-case-config-management';
import { UseCase } from '../../../model/use-case';
import { MCPUsecaseValidator } from '../../../model/validators/mcp-validator'
import { ValidatorFactory } from '../../../model/validators/validator-factory'

jest.mock('../../../power-tools-init', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    },
    tracer: {
        getRootXrayTraceId: jest.fn().mockReturnValue('test-trace-id'),
        captureMethod: () => () => {},
        captureAWSv3Client: jest.fn((client) => client)
    }
}));

describe('MCP Validator', () => {
    let validator: SchemaUploadValidator;

    beforeEach(() => {
        validator = new SchemaUploadValidator();
    });

    describe('McpOperationsValidator Factory', () => {
        it('should create SchemaUploadValidator for upload-schema operation', () => {
            const createdValidator = McpOperationsValidator.createValidator(McpOperationTypes.UPLOAD_SCHEMA);
            expect(createdValidator).toBeInstanceOf(SchemaUploadValidator);
        });

        it('should throw error for invalid operation type', () => {
            expect(() => McpOperationsValidator.createValidator('invalid-operation')).toThrow(
                'Invalid MCP operation type: invalid-operation'
            );
        });
    });

    describe('SchemaUploadValidator', () => {
        describe('validateMcpOperation', () => {
            it('should successfully validate and process single file', async () => {
                const mockOperation = {
                    rawFiles: [
                        {
                            schemaType: GATEWAY_TARGET_TYPES.OPEN_API,
                            fileName: 'api-spec.json'
                        }
                    ],
                    files: []
                };

                const result = (await validator.validateMcpOperation(mockOperation)) as any;

                expect(result.files).toHaveLength(1);
                expect(result.files[0]).toEqual({
                    schemaType: GATEWAY_TARGET_TYPES.OPEN_API,
                    fileName: 'api-spec.json',
                    fileExtension: '.json',
                    contentType: MCP_CONTENT_TYPES.JSON
                });
            });

            it('should successfully validate and process multiple files', async () => {
                const mockOperation = {
                    rawFiles: [
                        {
                            schemaType: GATEWAY_TARGET_TYPES.OPEN_API,
                            fileName: 'api-spec.yaml'
                        },
                        {
                            schemaType: GATEWAY_TARGET_TYPES.LAMBDA,
                            fileName: 'lambda-schema.json'
                        }
                    ],
                    files: []
                };

                const result = (await validator.validateMcpOperation(mockOperation)) as any;

                expect(result.files).toHaveLength(2);

                expect(result.files[0]).toEqual({
                    schemaType: GATEWAY_TARGET_TYPES.OPEN_API,
                    fileName: 'api-spec.yaml',
                    fileExtension: '.yaml',
                    contentType: MCP_CONTENT_TYPES.YAML
                });

                expect(result.files[1]).toEqual({
                    schemaType: GATEWAY_TARGET_TYPES.LAMBDA,
                    fileName: 'lambda-schema.json',
                    fileExtension: '.json',
                    contentType: MCP_CONTENT_TYPES.JSON
                });
            });

            it('should throw error for missing schemaType', async () => {
                const mockOperation = {
                    rawFiles: [
                        {
                            fileName: 'api-spec.json'
                        }
                    ],
                    files: []
                };

                await expect(validator.validateMcpOperation(mockOperation)).rejects.toThrow(
                    'files[0].schemaType is required and must be a non-empty string'
                );
            });

            it('should throw error for missing fileName', async () => {
                const mockOperation = {
                    rawFiles: [
                        {
                            schemaType: GATEWAY_TARGET_TYPES.OPEN_API
                        }
                    ],
                    files: []
                };

                await expect(validator.validateMcpOperation(mockOperation)).rejects.toThrow(
                    'files[0].fileName is required and must be a non-empty string'
                );
            });

            it('should throw error for missing file extension', async () => {
                const mockOperation = {
                    rawFiles: [
                        {
                            schemaType: GATEWAY_TARGET_TYPES.OPEN_API,
                            fileName: 'api-spec'
                        }
                    ],
                    files: []
                };

                await expect(validator.validateMcpOperation(mockOperation)).rejects.toThrow(
                    "files[0].fileName 'api-spec' must have a valid file extension"
                );
            });

            it('should throw error for invalid schema type', async () => {
                const mockOperation = {
                    rawFiles: [
                        {
                            schemaType: 'invalid-type',
                            fileName: 'api-spec.json'
                        }
                    ],
                    files: []
                };

                await expect(validator.validateMcpOperation(mockOperation)).rejects.toThrow(
                    "Invalid files[0].schemaType 'invalid-type' for file 'api-spec.json'. Must be one of:"
                );
            });

            it('should throw error for incompatible file extension', async () => {
                const mockOperation = {
                    rawFiles: [
                        {
                            schemaType: GATEWAY_TARGET_TYPES.LAMBDA,
                            fileName: 'lambda-schema.yaml' // Invalid for lambda
                        }
                    ],
                    files: []
                };

                await expect(validator.validateMcpOperation(mockOperation)).rejects.toThrow(
                    "Invalid files[0] file extension '.yaml' for file 'lambda-schema.yaml' with schema type 'lambda'"
                );
            });

            it('should throw error for unsupported file extension', async () => {
                const mockOperation = {
                    rawFiles: [
                        {
                            schemaType: GATEWAY_TARGET_TYPES.OPEN_API,
                            fileName: 'api-spec.xml'
                        }
                    ],
                    files: []
                };

                await expect(validator.validateMcpOperation(mockOperation)).rejects.toThrow(
                    "Invalid files[0] file extension '.xml' for file 'api-spec.xml' with schema type 'openApiSchema'. Allowed extensions: .json, .yaml, .yml"
                );
            });

            it('should set correct content types for different extensions', async () => {
                const testCases = [
                    { fileName: 'spec.json', expectedContentType: MCP_CONTENT_TYPES.JSON },
                    { fileName: 'spec.yaml', expectedContentType: MCP_CONTENT_TYPES.YAML },
                    { fileName: 'spec.yml', expectedContentType: MCP_CONTENT_TYPES.YAML }
                ];

                for (const testCase of testCases) {
                    const mockOperation = {
                        rawFiles: [
                            {
                                schemaType: GATEWAY_TARGET_TYPES.OPEN_API,
                                fileName: testCase.fileName
                            }
                        ],
                        files: []
                    };

                    const result = (await validator.validateMcpOperation(mockOperation)) as any;
                    expect(result.files[0].contentType).toBe(testCase.expectedContentType);
                }
            });
        });
    });
});

describe('Testing MCP Use Case Validation', () => {
    let mcpValidator: MCPUsecaseValidator;
    let cfnParameters: Map<string, string>;
    let ddbMockedClient: any;

    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "customUserAgent": "AWSSOLUTION/SO0276/v2.0.0" }';
        process.env[MODEL_INFO_TABLE_NAME_ENV_VAR] = 'model-info-table';
        process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'use-case-config-table';
        process.env.AWS_REGION = 'us-east-1';

        const storageMgmt = new StorageManagement();
        const useCaseConfigManagement = new UseCaseConfigManagement();

        // Use the factory method like other tests
        mcpValidator = ValidatorFactory.createValidator(UseCaseTypes.MCP_SERVER, storageMgmt, useCaseConfigManagement) as MCPUsecaseValidator;

        cfnParameters = new Map<string, string>();
        cfnParameters.set(CfnParameterKeys.UseCaseUUID, 'fake-uuid');

        ddbMockedClient = mockClient(DynamoDBClient);
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env[MODEL_INFO_TABLE_NAME_ENV_VAR];
        delete process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR];
        delete process.env.AWS_REGION;
        ddbMockedClient.restore();
    });

    describe('Environment Variables Validation', () => {
        it('should pass validation with valid environment variables', async () => {
            const validEnvVars = {
                'API_KEY': 'test-key-123',
                'DATABASE_URL': 'postgresql://localhost:5432/db',
                'DEBUG_MODE': 'true',
                '_PRIVATE_VAR': 'private-value'
            };

            const mcpConfig = {
                MCPParams: {
                    RuntimeParams: {
                        EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest',
                        EnvironmentVariables: validEnvVars
                    }
                }
            };

            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create MCP server',
                cfnParameters,
                mcpConfig,
                'test-user',
                'FakeProviderName',
                'MCPServer'
            );

            // Should not throw any errors
            await expect(mcpValidator.validateNewUseCase(useCase)).resolves.toBeDefined();
        });

        it('should pass validation when no environment variables are provided', async () => {
            const mcpConfig = {
                MCPParams: {
                    RuntimeParams: {
                        EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest'
                    }
                }
            };

            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create MCP server',
                cfnParameters,
                mcpConfig,
                'test-user',
                'FakeProviderName',
                'MCPServer'
            );

            // Should not throw any errors
            await expect(mcpValidator.validateNewUseCase(useCase)).resolves.toBeDefined();
        });

        it('should fail validation when environment variables is not an object', async () => {
            const mcpConfig = {
                MCPParams: {
                    RuntimeParams: {
                        EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest',
                        EnvironmentVariables: null as any
                    }
                }
            };

            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create MCP server',
                cfnParameters,
                mcpConfig,
                'test-user',
                'FakeProviderName',
                'MCPServer'
            );

            await expect(mcpValidator.validateNewUseCase(useCase)).rejects.toThrow('Environment variables must be provided as an object');
        });

        it('should fail validation with invalid environment variable names', async () => {
            const testCases = [
                { name: '', value: 'test', expectedError: 'Environment variable names cannot be empty' },
                { name: '123INVALID', value: 'test', expectedError: 'Invalid environment variable name "123INVALID". Names must start with a letter or underscore and contain only letters, numbers, and underscores' },
                { name: 'INVALID-NAME', value: 'test', expectedError: 'Invalid environment variable name "INVALID-NAME". Names must start with a letter or underscore and contain only letters, numbers, and underscores' },
                { name: 'INVALID.NAME', value: 'test', expectedError: 'Invalid environment variable name "INVALID.NAME". Names must start with a letter or underscore and contain only letters, numbers, and underscores' },
                { name: 'INVALID NAME', value: 'test', expectedError: 'Invalid environment variable name "INVALID NAME". Names must start with a letter or underscore and contain only letters, numbers, and underscores' }
            ];

            for (const testCase of testCases) {
                const mcpConfig = {
                    MCPParams: {
                        RuntimeParams: {
                            EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest',
                            EnvironmentVariables: {
                                [testCase.name]: testCase.value
                            }
                        }
                    }
                };

                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create MCP server',
                    cfnParameters,
                    mcpConfig,
                    'test-user',
                    'FakeProviderName',
                    'MCPServer'
                );

                try {
                    await mcpValidator.validateNewUseCase(useCase);
                    fail(`Expected validation to throw an error for test case: ${testCase.name}`);
                } catch (error: any) {
                    expect(error.message).toBe(testCase.expectedError);
                }
            }
        });

        it('should fail validation when environment variable name is too long', async () => {
            const longName = 'A'.repeat(257); // 257 characters, exceeds 256 limit
            const mcpConfig = {
                MCPParams: {
                    RuntimeParams: {
                        EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest',
                        EnvironmentVariables: {
                            [longName]: 'test-value'
                        }
                    }
                }
            };

            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create MCP server',
                cfnParameters,
                mcpConfig,
                'test-user',
                'FakeProviderName',
                'MCPServer'
            );

            try {
                await mcpValidator.validateNewUseCase(useCase);
                fail('Expected validation to throw an error');
            } catch (error: any) {
                expect(error.message).toBe(`Environment variable name "${longName}" exceeds maximum length of 256 characters`);
            }
        });

        it('should fail validation when environment variable value is not a string', async () => {
            const mcpConfig = {
                MCPParams: {
                    RuntimeParams: {
                        EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest',
                        EnvironmentVariables: {
                            'VALID_NAME': 123 as any // Type assertion to bypass TypeScript check for testing invalid input
                        }
                    }
                }
            };

            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create MCP server',
                cfnParameters,
                mcpConfig,
                'test-user',
                'FakeProviderName',
                'MCPServer'
            );

            try {
                await mcpValidator.validateNewUseCase(useCase);
                fail('Expected validation to throw an error');
            } catch (error: any) {
                expect(error.message).toBe('Environment variable value for "VALID_NAME" must be a string');
            }
        });

        it('should fail validation when environment variable value is too long', async () => {
            const longValue = 'A'.repeat(2049); // 2049 characters, exceeds 2048 limit
            const mcpConfig = {
                MCPParams: {
                    RuntimeParams: {
                        EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest',
                        EnvironmentVariables: {
                            'VALID_NAME': longValue
                        }
                    }
                }
            };

            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create MCP server',
                cfnParameters,
                mcpConfig,
                'test-user',
                'FakeProviderName',
                'MCPServer'
            );

            try {
                await mcpValidator.validateNewUseCase(useCase);
                fail('Expected validation to throw an error');
            } catch (error: any) {
                expect(error.message).toBe('Environment variable value for "VALID_NAME" exceeds maximum length of 2048 characters');
            }
        });

        it('should fail validation when total environment variables size exceeds 4KB', async () => {
            // Create environment variables that exceed 4KB total
            const largeEnvVars: { [key: string]: string } = {};
            const largeValue = 'A'.repeat(1000); // 1KB per variable
            for (let i = 0; i < 5; i++) {
                largeEnvVars[`LARGE_VAR_${i}`] = largeValue;
            }

            const mcpConfig = {
                MCPParams: {
                    RuntimeParams: {
                        EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest',
                        EnvironmentVariables: largeEnvVars
                    }
                }
            };

            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create MCP server',
                cfnParameters,
                mcpConfig,
                'test-user',
                'FakeProviderName',
                'MCPServer'
            );

            try {
                await mcpValidator.validateNewUseCase(useCase);
                fail('Expected validation to throw an error');
            } catch (error: any) {
                expect(error.message).toBe('Total size of environment variables exceeds 4KB limit. Please reduce the number or size of environment variables');
            }
        });
    });

    describe('MCP Runtime Parameters Validation', () => {
        it('should pass validation with valid runtime parameters', async () => {
            const mcpConfig = {
                MCPParams: {
                    RuntimeParams: {
                        EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest',
                        EnvironmentVariables: {
                            'API_KEY': 'test-key'
                        }
                    }
                }
            };

            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create MCP server',
                cfnParameters,
                mcpConfig,
                'test-user',
                'FakeProviderName',
                'MCPServer'
            );

            await expect(mcpValidator.validateNewUseCase(useCase)).resolves.toBeDefined();
        });

        it('should fail validation when ECR URI is missing', async () => {
            const mcpConfig = {
                MCPParams: {
                    RuntimeParams: {
                        EnvironmentVariables: {
                            'API_KEY': 'test-key'
                        }
                    } as any // Type assertion to bypass TypeScript check for testing missing required field
                }
            };

            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create MCP server',
                cfnParameters,
                mcpConfig,
                'test-user',
                'FakeProviderName',
                'MCPServer'
            );

            try {
                await mcpValidator.validateNewUseCase(useCase);
                fail('Expected validation to throw an error');
            } catch (error: any) {
                expect(error.message).toBe('ECR URI is required when deploying MCP servers with Agentcore Runtime');
            }
        });

        it('should fail validation when ECR URI is empty', async () => {
            const mcpConfig = {
                MCPParams: {
                    RuntimeParams: {
                        EcrUri: '',
                        EnvironmentVariables: {
                            'API_KEY': 'test-key'
                        }
                    }
                }
            };

            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create MCP server',
                cfnParameters,
                mcpConfig,
                'test-user',
                'FakeProviderName',
                'MCPServer'
            );

            try {
                await mcpValidator.validateNewUseCase(useCase);
                fail('Expected validation to throw an error');
            } catch (error: any) {
                expect(error.message).toBe('ECR URI is required when deploying MCP servers with Agentcore Runtime');
            }
        });

        it('should fail validation when ECR URI region does not match deployment region', async () => {
            const mcpConfig = {
                MCPParams: {
                    RuntimeParams: {
                        EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest',
                        EnvironmentVariables: {
                            'API_KEY': 'test-key'
                        }
                    }
                }
            };

            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create MCP server',
                cfnParameters,
                mcpConfig,
                'test-user',
                'FakeProviderName',
                'MCPServer'
            );

            const originalRegion = process.env.AWS_REGION;
            process.env.AWS_REGION = 'us-west-2';

            try {
                await mcpValidator.validateNewUseCase(useCase);
                fail('Expected validation to throw an error');
            } catch (error: any) {
                expect(error.message).toContain('ECR image must be in the same region (us-west-2) as the deployment');
            } finally {
                if (originalRegion !== undefined) {
                    process.env.AWS_REGION = originalRegion;
                } else {
                    delete process.env.AWS_REGION;
                }
            }
        });
    });

    describe('MCP Parameters Structure Validation', () => {
        it('should fail validation when MCPParams is missing', async () => {
            const mcpConfig = {};

            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create MCP server',
                cfnParameters,
                mcpConfig,
                'test-user',
                'FakeProviderName',
                'MCPServer'
            );

            try {
                await mcpValidator.validateNewUseCase(useCase);
                fail('Expected validation to throw an error');
            } catch (error: any) {
                expect(error.message).toBe('MCPParams is required for MCP use cases');
            }
        });

        it('should fail validation when neither GatewayParams nor RuntimeParams is provided', async () => {
            const mcpConfig = {
                MCPParams: {}
            };

            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create MCP server',
                cfnParameters,
                mcpConfig,
                'test-user',
                'FakeProviderName',
                'MCPServer'
            );

            try {
                await mcpValidator.validateNewUseCase(useCase);
                fail('Expected validation to throw an error');
            } catch (error: any) {
                expect(error.message).toBe('Either GatewayParams or RuntimeParams must be provided for MCP use cases');
            }
        });

        it('should fail validation when both GatewayParams and RuntimeParams are provided', async () => {
            const mcpConfig = {
                MCPParams: {
                    GatewayParams: {
                        TargetParams: []
                    },
                    RuntimeParams: {
                        EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest'
                    }
                }
            };

            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create MCP server',
                cfnParameters,
                mcpConfig,
                'test-user',
                'FakeProviderName',
                'MCPServer'
            );

            try {
                await mcpValidator.validateNewUseCase(useCase);
                fail('Expected validation to throw an error');
            } catch (error: any) {
                expect(error.message).toBe('Only one of GatewayParams or RuntimeParams should be provided, not both');
            }
        });
    });

    // Optional Gateway Fields Validation tests moved to mcp-validator-optional-fields.test.ts
    // to avoid TypeScript compilation issues with complex type assertions
        const createValidTargetParams = (): TargetParams => ({
            TargetName: 'test-target',
            TargetType: GATEWAY_TARGET_TYPES.LAMBDA,
            LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
            SchemaUri: 'mcp/schemas/lambda/12345678-1234-1234-1234-123456789012.json'
        });

        const createValidOpenApiTargetParams = (): TargetParams => ({
            TargetName: 'test-target',
            TargetType: GATEWAY_TARGET_TYPES.OPEN_API,
            SchemaUri: 'mcp/schemas/openApiSchema/12345678-1234-1234-1234-123456789012.json',
            OutboundAuthParams: {
                OutboundAuthProviderArn: 'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-provider',
                OutboundAuthProviderType: 'OAUTH'
            }
        });

        const createTargetParamsWithId = (targetId: string): TargetParams => ({
            TargetName: 'test-target',
            TargetType: GATEWAY_TARGET_TYPES.LAMBDA,
            TargetId: targetId,
            LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
            SchemaUri: 'mcp/schemas/lambda/12345678-1234-1234-1234-123456789012.json'
        });

        const createOpenApiTargetParamsWithArn = (arn: string): TargetParams => ({
            TargetName: 'test-target',
            TargetType: GATEWAY_TARGET_TYPES.OPEN_API,
            SchemaUri: 'mcp/schemas/openApiSchema/12345678-1234-1234-1234-123456789012.json',
            OutboundAuthParams: {
                OutboundAuthProviderArn: arn,
                OutboundAuthProviderType: 'OAUTH'
            }
        });
        describe('GatewayId validation', () => {
            it('should pass with valid GatewayId pattern (prefix-{10chars})', async () => {
                const mcpConfig = {
                    MCPParams: {
                        GatewayParams: {
                            GatewayId: 'test-abc1234567',
                            TargetParams: [createValidTargetParams()]
                        }
                    }
                };


                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create MCP server',
                    cfnParameters,
                    mcpConfig,
                    'test-user',
                    'FakeProviderName',
                    'MCPServer'
                );

                await expect(mcpValidator.validateNewUseCase(useCase)).resolves.not.toThrow();
            });

            it('should fail with empty GatewayId', async () => {
                const mcpConfig = {
                    MCPParams: {
                        GatewayParams: {
                            GatewayId: '',
                            TargetParams: [createValidTargetParams()]
                        }
                    }
                };

                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create MCP server',
                    cfnParameters,
                    mcpConfig,
                    'test-user',
                    'FakeProviderName',
                    'MCPServer'
                );

                try {
                    await mcpValidator.validateNewUseCase(useCase);
                    fail('Expected validation to throw an error');
                } catch (error: any) {
                    expect(error.message).toBe('GatewayId must be a non-empty string');
                }
            });

        });

        describe('GatewayArn validation', () => {
            it('should pass with valid gateway ARN', async () => {
                const mcpConfig = {
                    MCPParams: {
                        GatewayParams: {
                            GatewayArn: 'arn:aws:bedrock-agentcore:us-east-1:123456789012:gateway/test-gateway-123',
                            TargetParams: [createValidTargetParams()]
                        }
                    }
                };

                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create MCP server',
                    cfnParameters,
                    mcpConfig,
                    'test-user',
                    'FakeProviderName',
                    'MCPServer'
                );

                await expect(mcpValidator.validateNewUseCase(useCase)).resolves.not.toThrow();
            });

            it('should fail with invalid gateway ARN format', async () => {
                const mcpConfig = {
                    MCPParams: {
                        GatewayParams: {
                            GatewayArn: 'arn:aws:bedrock-agentcore:us-east-1:123456789012:invalid-resource',
                            TargetParams: [createValidTargetParams()]
                        }
                    }
                };

                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create MCP server',
                    cfnParameters,
                    mcpConfig,
                    'test-user',
                    'FakeProviderName',
                    'MCPServer'
                );

                try {
                    await mcpValidator.validateNewUseCase(useCase);
                    fail('Expected validation to throw an error');
                } catch (error: any) {
                    expect(error.message).toBe('GatewayArn must follow pattern: arn:aws:bedrock-agentcore:{region}:{AccountId}:gateway/{GatewayId}');
                }
            });

            it('should fail with wrong service in ARN', async () => {
                const mcpConfig = {
                    MCPParams: {
                        GatewayParams: {
                            GatewayArn: 'arn:aws:lambda:us-east-1:123456789012:gateway/test-gateway',
                            TargetParams: [createValidTargetParams()]
                        }
                    }
                };

                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create MCP server',
                    cfnParameters,
                    mcpConfig,
                    'test-user',
                    'FakeProviderName',
                    'MCPServer'
                );

                try {
                    await mcpValidator.validateNewUseCase(useCase);
                    fail('Expected validation to throw an error');
                } catch (error: any) {
                    expect(error.message).toBe('GatewayArn must follow pattern: arn:aws:bedrock-agentcore:{region}:{AccountId}:gateway/{GatewayId}');
                }
            });

            it('should pass when GatewayArn is undefined', async () => {
                const mcpConfig = {
                    MCPParams: {
                        GatewayParams: {
                            TargetParams: [createValidTargetParams()]
                        }
                    }
                };

                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create MCP server',
                    cfnParameters,
                    mcpConfig,
                    'test-user',
                    'FakeProviderName',
                    'MCPServer'
                );

                await expect(mcpValidator.validateNewUseCase(useCase)).resolves.not.toThrow();
            });
        });

        describe('GatewayUrl validation', () => {
            it('should pass with valid gateway URL pattern', async () => {
                const mcpConfig = {
                    MCPParams: {
                        GatewayParams: {
                            GatewayUrl: 'https://test-gateway-123.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                            TargetParams: [createValidTargetParams()]
                        }
                    }
                };

                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create MCP server',
                    cfnParameters,
                    mcpConfig,
                    'test-user',
                    'FakeProviderName',
                    'MCPServer'
                );

                await expect(mcpValidator.validateNewUseCase(useCase)).resolves.not.toThrow();
            });

            it('should fail with invalid URL format', async () => {
                const mcpConfig = {
                    MCPParams: {
                        GatewayParams: {
                            GatewayUrl: 'https://invalid-domain.com/mcp',
                            TargetParams: [createValidTargetParams()]
                        }
                    }
                };

                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create MCP server',
                    cfnParameters,
                    mcpConfig,
                    'test-user',
                    'FakeProviderName',
                    'MCPServer'
                );

                try {
                    await mcpValidator.validateNewUseCase(useCase);
                    fail('Expected validation to throw an error');
                } catch (error: any) {
                    expect(error.message).toBe('GatewayUrl must follow pattern: https://{GatewayId}.gateway.bedrock-agentcore.{Region}.amazonaws.com/mcp');
                }
            });

        });

        describe('GatewayName validation', () => {
            it('should pass with valid gateway name', async () => {
                const mcpConfig = {
                    MCPParams: {
                        GatewayParams: {
                            GatewayName: 'My Test Gateway',
                            TargetParams: [createValidTargetParams()]
                        }
                    }
                };

                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create MCP server',
                    cfnParameters,
                    mcpConfig,
                    'test-user',
                    'FakeProviderName',
                    'MCPServer'
                );

                await expect(mcpValidator.validateNewUseCase(useCase)).resolves.not.toThrow();
            });

            it('should fail with empty GatewayName', async () => {
                const mcpConfig = {
                    MCPParams: {
                        GatewayParams: {
                            GatewayName: '',
                            TargetParams: [createValidTargetParams()]
                        }
                    }
                };

                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create MCP server',
                    cfnParameters,
                    mcpConfig,
                    'test-user',
                    'FakeProviderName',
                    'MCPServer'
                );

                try {
                    await mcpValidator.validateNewUseCase(useCase);
                    fail('Expected validation to throw an error');
                } catch (error: any) {
                    expect(error.message).toBe('GatewayName must be a non-empty string');
                }
            });

        });

        describe('TargetId validation', () => {
            it('should pass with valid 10-character uppercase alphanumeric TargetId', async () => {
                const mcpConfig = {
                    MCPParams: {
                        GatewayParams: {
                            TargetParams: [createTargetParamsWithId('ABC1234567')]
                        }
                    }
                };

                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create MCP server',
                    cfnParameters,
                    mcpConfig,
                    'test-user',
                    'FakeProviderName',
                    'MCPServer'
                );

                await expect(mcpValidator.validateNewUseCase(useCase)).resolves.not.toThrow();
            });

            it('should fail with TargetId shorter than 10 characters', async () => {
                const mcpConfig = {
                    MCPParams: {
                        GatewayParams: {
                            TargetParams: [createTargetParamsWithId('ABC123')]
                        }
                    }
                };

                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create MCP server',
                    cfnParameters,
                    mcpConfig,
                    'test-user',
                    'FakeProviderName',
                    'MCPServer'
                );

                try {
                    await mcpValidator.validateNewUseCase(useCase);
                    fail('Expected validation to throw an error');
                } catch (error: any) {
                    expect(error.message).toBe('TargetId must be exactly 10 uppercase alphanumeric characters for target "test-target"');
                }
            });

            it('should fail with TargetId longer than 10 characters', async () => {
                const mcpConfig = {
                    MCPParams: {
                        GatewayParams: {
                            TargetParams: [createTargetParamsWithId('ABC1234567890')]
                        }
                    }
                };

                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create MCP server',
                    cfnParameters,
                    mcpConfig,
                    'test-user',
                    'FakeProviderName',
                    'MCPServer'
                );

                try {
                    await mcpValidator.validateNewUseCase(useCase);
                    fail('Expected validation to throw an error');
                } catch (error: any) {
                    expect(error.message).toBe('TargetId must be exactly 10 uppercase alphanumeric characters for target "test-target"');
                }
            });

            it('should fail with lowercase characters in TargetId', async () => {
                const mcpConfig = {
                    MCPParams: {
                        GatewayParams: {
                            TargetParams: [createTargetParamsWithId('abc1234567')]
                        }
                    }
                };

                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create MCP server',
                    cfnParameters,
                    mcpConfig,
                    'test-user',
                    'FakeProviderName',
                    'MCPServer'
                );

                try {
                    await mcpValidator.validateNewUseCase(useCase);
                    fail('Expected validation to throw an error');
                } catch (error: any) {
                    expect(error.message).toBe('TargetId must be exactly 10 uppercase alphanumeric characters for target "test-target"');
                }
            });

            it('should fail with special characters in TargetId', async () => {
                const mcpConfig = {
                    MCPParams: {
                        GatewayParams: {
                            TargetParams: [createTargetParamsWithId('ABC123-456')]
                        }
                    }
                };

                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create MCP server',
                    cfnParameters,
                    mcpConfig,
                    'test-user',
                    'FakeProviderName',
                    'MCPServer'
                );

                try {
                    await mcpValidator.validateNewUseCase(useCase);
                    fail('Expected validation to throw an error');
                } catch (error: any) {
                    expect(error.message).toBe('TargetId must be exactly 10 uppercase alphanumeric characters for target "test-target"');
                }
            });

        });

        describe('Updated outbound auth validation', () => {
            it('should pass with valid OAuth ARN', async () => {
                const mcpConfig = {
                    MCPParams: {
                        GatewayParams: {
                            TargetParams: [createValidOpenApiTargetParams()]
                        }
                    }
                };

                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create MCP server',
                    cfnParameters,
                    mcpConfig,
                    'test-user',
                    'FakeProviderName',
                    'MCPServer'
                );

                await expect(mcpValidator.validateNewUseCase(useCase)).resolves.not.toThrow();
            });

            it('should pass with valid API Key ARN', async () => {
                const mcpConfig = {
                    MCPParams: {
                        GatewayParams: {
                            TargetParams: [createOpenApiTargetParamsWithArn('arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-provider')]
                        }
                    }
                };

                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create MCP server',
                    cfnParameters,
                    mcpConfig,
                    'test-user',
                    'FakeProviderName',
                    'MCPServer'
                );

                await expect(mcpValidator.validateNewUseCase(useCase)).resolves.not.toThrow();
            });

            it('should fail when ARN matches neither OAuth nor API Key pattern', async () => {
                const mcpConfig = {
                    MCPParams: {
                        GatewayParams: {
                            TargetParams: [createOpenApiTargetParamsWithArn('arn:aws:bedrock-agentcore:us-east-1:123456789012:gateway/invalid-resource')]
                        }
                    }
                };

                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create MCP server',
                    cfnParameters,
                    mcpConfig,
                    'test-user',
                    'FakeProviderName',
                    'MCPServer'
                );

                try {
                    await mcpValidator.validateNewUseCase(useCase);
                    fail('Expected validation to throw an error');
                } catch (error: any) {
                    expect(error.message).toBe('Invalid outbound authentication provider ARN format for target "test-target"');
                }
            });
        });
    });
