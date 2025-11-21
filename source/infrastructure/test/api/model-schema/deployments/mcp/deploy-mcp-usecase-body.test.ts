// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Validator } from 'jsonschema';
import { deployMcpUseCaseBodySchema } from '../../../../../lib/api/model-schema/deployments/mcp/deploy-mcp-usecase-body';
import { checkValidationSucceeded, checkValidationFailed } from '../../shared/utils';

describe('Testing Deploy MCP Use Case Body schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        schema = deployMcpUseCaseBodySchema;
        validator = new Validator();
    });

    describe('Valid MCP Use Case Deployments', () => {
        it('should validate gateway-type MCP server deployment', () => {
            const payload = {
                UseCaseName: 'Test MCP Gateway Use Case',
                UseCaseDescription: 'A test MCP gateway use case',
                UseCaseType: 'MCPServer',
                MCPParams: {
                    GatewayParams: {
                        TargetParams: [
                            {
                                TargetName: 'test-lambda-target',
                                TargetDescription: 'Test Lambda target',
                                TargetType: 'lambda',
                                LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
                                SchemaUri: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                            }
                        ]
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate runtime-type MCP server deployment', () => {
            const payload = {
                UseCaseName: 'Test MCP Runtime Use Case',
                UseCaseDescription: 'A test MCP runtime use case',
                UseCaseType: 'MCPServer',
                MCPParams: {
                    RuntimeParams: {
                        EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest'
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate ECR URIs with standard ECR URI formats', () => {
            const validEcrUris = [
                '123456789012.dkr.ecr.us-east-1.amazonaws.com/mcp-server:latest',
                '123456789012.dkr.ecr.us-west-2.amazonaws.com/dynamodb-mcp-server:v1.0'
            ];

            validEcrUris.forEach(ecrUri => {
                const payload = {
                    UseCaseName: 'Test MCP Runtime Use Case',
                    UseCaseDescription: 'A test MCP runtime use case',
                    UseCaseType: 'MCPServer',
                    MCPParams: {
                        RuntimeParams: {
                            EcrUri: ecrUri
                        }
                    }
                };
                const result = validator.validate(payload, schema);
                expect(result.errors).toHaveLength(0);
            });
        });

        it('should validate gateway with multiple targets', () => {
            const payload = {
                UseCaseName: 'Multi-Target Gateway',
                UseCaseType: 'MCPServer',
                MCPParams: {
                    GatewayParams: {
                        TargetParams: [
                            {
                                TargetName: 'lambda-target',
                                TargetDescription: 'Lambda target',
                                TargetType: 'lambda',
                                LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
                                SchemaUri: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                            },
                            {
                                TargetName: 'openapi-target',
                                TargetDescription: 'OpenAPI target',
                                TargetType: 'openApiSchema',
                                SchemaUri: 'mcp/schemas/openApiSchema/f1a2b3c4-5678-40fe-859e-d4e5f67a8b9c.json',
                                OutboundAuthParams: {
                                    OutboundAuthProviderArn:
                                        'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-api-key',
                                    OutboundAuthProviderType: 'API_KEY'
                                }
                            }
                        ]
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate with optional UseCaseDescription', () => {
            const payload = {
                UseCaseName: 'Test Use Case',
                UseCaseType: 'MCPServer',
                MCPParams: {
                    GatewayParams: {
                        TargetParams: [
                            {
                                TargetName: 'test-target',
                                TargetDescription: 'Test target',
                                TargetType: 'smithyModel',
                                SchemaUri: 'mcp/schemas/smithyModel/e9b1801d-2516-40fe-859e-a0c7d81da2f3.smithy'
                            }
                        ]
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
    });

    describe('Invalid MCP Use Case Deployments', () => {
        it('should fail validation when UseCaseName is missing', () => {
            const payload = {
                MCPParams: {
                    GatewayParams: {
                        TargetParams: [
                            {
                                TargetName: 'test-target',
                                TargetDescription: 'Test target',
                                TargetType: 'lambda',
                                LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
                                SchemaUri: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                            }
                        ]
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when MCPParams is missing', () => {
            const payload = {
                UseCaseName: 'Test Use Case',
                UseCaseType: 'MCPServer'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Gateway Type Conditional Validation', () => {
        it('should fail validation when gateway type missing GatewayParams', () => {
            const payload = {
                UseCaseName: 'Test Use Case',
                UseCaseType: 'MCPServer',
                MCPParams: {}
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when gateway type has RuntimeParams', () => {
            const payload = {
                UseCaseName: 'Test Use Case',
                UseCaseType: 'MCPServer',
                MCPParams: {
                    GatewayParams: {
                        TargetParams: [
                            {
                                TargetName: 'test-target',
                                TargetDescription: 'Test target',
                                TargetType: 'lambda',
                                LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
                                SchemaUri: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                            }
                        ]
                    },
                    RuntimeParams: {
                        EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest'
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Runtime Type Conditional Validation', () => {
        it('should fail validation when runtime type missing RuntimeParams', () => {
            const payload = {
                UseCaseName: 'Test Use Case',
                UseCaseType: 'MCPServer',
                MCPParams: {}
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when runtime type has GatewayParams', () => {
            const payload = {
                UseCaseName: 'Test Use Case',
                UseCaseType: 'MCPServer',
                MCPParams: {
                    RuntimeParams: {
                        EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest'
                    },
                    GatewayParams: {
                        TargetParams: [
                            {
                                TargetName: 'test-target',
                                TargetDescription: 'Test target',
                                TargetType: 'lambda',
                                LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
                                SchemaUri: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                            }
                        ]
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when runtime config missing EcrUri', () => {
            const payload = {
                UseCaseName: 'Test Use Case',
                UseCaseType: 'MCPServer',
                MCPParams: {
                    RuntimeParams: {}
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with invalid ECR image URI format', () => {
            const invalidEcrUris = [
                'invalid-image-uri',
                '12345678901.dkr.ecr.us-east-1.amazonaws.com/mcp-server:tag', // 11 digits instead of 12
                '123456789012.dkr.ecr.us-east-1.amazonaws.com/mcp-server', // No tag
                '123456789012.dkr.ecr.us-east-1.amazonaws.com/mcp-server:my tag', // Space in tag
                '123456789012.dkr.ecr.us-east-1.amazonaws.com/repo@name:latest', // @ in repo name
                '123456789012.dkr.ecr.us-east-1.amazonaws.com/repo#name:latest', // # in repo name
                '123456789012.dkr.ecr.us-east-1.amazonaws.com/repo%name:latest', // % in repo name
                '123456789012.dkr.ecr.us-east-1.amazonaws.com/a:latest', // very short repo name
                '123456789012.dkr.ecr.us-east-1.amazonaws.com/../repo:latest', // path traversal
                '123456789012.dkr.ecr.us-east-1.amazonaws.com//repo:latest', // double slashes
                ' 123456789012.dkr.ecr.us-east-1.amazonaws.com/repo:latest', // leading space
                '123456789012.dkr.ecr.us-east-1.amazonaws.com/repo:latest ', // trailing space
                'abcd56789012.dkr.ecr.us-east-1.amazonaws.com/repo:latest', // letters in account ID
                '123456789012.ecr.us-east-1.amazonaws.com/repo:latest', // missing 'dkr'
                '123456789012.dkr.ecr.amazonaws.com/repo:latest', // missing region
                '123456789012.dkr.ecr.us-east-1.amazonaws.com/repo:', // empty tag
                `123456789012.dkr.ecr.us-east-1.amazonaws.com/${'a'.repeat(300)}:latest`, // very long repo name
                `123456789012.dkr.ecr.us-east-1.amazonaws.com/repo:${'a'.repeat(350)}`, // very long tag
            ];

            invalidEcrUris.forEach(ecrUri => {
                const payload = {
                    UseCaseName: 'Test Use Case',
                    UseCaseType: 'MCPServer',
                    MCPParams: {
                        RuntimeParams: {
                            EcrUri: ecrUri
                        }
                    }
                };
                const result = validator.validate(payload, schema);
                expect(result.errors.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Additional Properties Validation', () => {
        it('should fail validation with additional properties in root', () => {
            const payload = {
                UseCaseName: 'Test Use Case',
                UseCaseType: 'MCPServer',
                MCPParams: {
                    GatewayParams: {
                        TargetParams: [
                            {
                                TargetName: 'test-target',
                                TargetDescription: 'Test target',
                                TargetType: 'lambda',
                                LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
                                SchemaUri: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                            }
                        ]
                    }
                },
                extraProperty: 'not-allowed'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with additional properties in MCPParams', () => {
            const payload = {
                UseCaseName: 'Test Use Case',
                UseCaseType: 'MCPServer',
                MCPParams: {
                    GatewayParams: {
                        TargetParams: [
                            {
                                TargetName: 'test-target',
                                TargetDescription: 'Test target',
                                TargetType: 'lambda',
                                LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
                                SchemaUri: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                            }
                        ]
                    },
                    extraProperty: 'not-allowed'
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with additional properties in RuntimeParams', () => {
            const payload = {
                UseCaseName: 'Test Use Case',
                UseCaseType: 'MCPServer',
                MCPParams: {
                    RuntimeParams: {
                        EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest',
                        extraProperty: 'not-allowed'
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });
});
