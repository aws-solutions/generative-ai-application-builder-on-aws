// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Validator } from 'jsonschema';
import { updateMcpUseCaseBodySchema } from '../../../../../lib/api/model-schema/deployments/mcp/update-mcp-usecase-body';
import { checkValidationSucceeded, checkValidationFailed } from '../../shared/utils';

describe('Testing Update MCP Use Case Body schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        schema = updateMcpUseCaseBodySchema;
        validator = new Validator();
    });

    describe('Valid MCP Use Case Updates', () => {
        it('should validate gateway-type MCP server update', () => {
            const payload = {
                UseCaseDescription: 'Updated MCP gateway use case description',
                MCPParams: {
                    GatewayParams: {
                        TargetParams: [
                            {
                                TargetName: 'updated-lambda-target',
                                TargetDescription: 'Updated Lambda target',
                                TargetType: 'lambda',
                                LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:updated-function',
                                SchemaUri: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f4.json'
                            }
                        ]
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate runtime-type MCP server update', () => {
            const payload = {
                UseCaseDescription: 'Updated MCP runtime use case description',
                MCPParams: {
                    RuntimeParams: {
                        EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-updated-mcp-server:v2.0'
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate update with only UseCaseDescription', () => {
            const payload = {
                UseCaseDescription: 'Just updating the description',
                MCPParams: {
                    GatewayParams: {
                        TargetParams: [
                            {
                                TargetName: 'existing-target',
                                TargetDescription: 'Existing target',
                                TargetType: 'smithyModel',
                                SchemaUri: 'mcp/schemas/smithyModel/e9b1801d-2516-40fe-859e-a0c7d81da2f3.smithy'
                            }
                        ]
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate gateway update with new target configuration', () => {
            const payload = {
                MCPParams: {
                    GatewayParams: {
                        TargetParams: [
                            {
                                TargetName: 'new-openapi-target',
                                TargetDescription: 'New OpenAPI target with OAuth',
                                TargetType: 'openApiSchema',
                                SchemaUri: 'mcp/schemas/openApiSchema/f1a2b3c4-5678-40fe-859e-d4e5f67a8b9d.json',
                                OutboundAuthParams: {
                                    OutboundAuthProviderArn:
                                        'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-oauth',
                                    OutboundAuthProviderType: 'OAUTH',
                                    AdditionalConfigParams: {
                                        OAuthAdditionalConfig: {
                                            scopes: ['read', 'write']
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate runtime update with new image URI', () => {
            const payload = {
                MCPParams: {
                    RuntimeParams: {
                        EcrUri: '987654321098.dkr.ecr.eu-west-1.amazonaws.com/different-mcp-server:latest'
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate runtime updates with standard ECR URI formats', () => {
            const validEcrUris = [
                '123456789012.dkr.ecr.us-east-1.amazonaws.com/mcp-server:latest',
                '123456789012.dkr.ecr.us-west-2.amazonaws.com/dynamodb-mcp-server:v2.0'
            ];

            validEcrUris.forEach(ecrUri => {
                const payload = {
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
    });

    describe('Invalid MCP Use Case Updates', () => {
        it('should fail validation when MCPParams is missing', () => {
            const payload = {
                UseCaseDescription: 'Updated description',
                UseCaseType: 'MCPServer'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when both GatewayParams and RuntimeParams are missing', () => {
            const payload = {
                UseCaseType: 'MCPServer',
                MCPParams: {}
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when empty payload is provided', () => {
            const payload = {};
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Gateway Type Conditional Validation', () => {
        it('should fail validation when gateway type has RuntimeParams', () => {
            const payload = {
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

        it('should validate gateway type with only GatewayParams', () => {
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
            checkValidationSucceeded(validator.validate(payload, schema));
        });
    });

    describe('Runtime Type Conditional Validation', () => {
        it('should fail validation when runtime type has GatewayParams', () => {
            const payload = {
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

        it('should validate runtime type with only RuntimeParams', () => {
            const payload = {
                MCPParams: {
                    RuntimeParams: {
                        EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest'
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should fail validation with invalid ECR image URI format', () => {
            // Note: Comprehensive ECR URI validation is covered in deploy-mcp-usecase-body.test.ts
            const invalidEcrUris = [
                'invalid-image-uri-format',
                '12345678901.dkr.ecr.us-east-1.amazonaws.com/mcp-server:tag', // 11 digits instead of 12
                '123456789012.dkr.ecr.us-east-1.amazonaws.com/mcp-server', // No tag
                '123456789012.dkr.ecr.us-east-1.amazonaws.com/repo:tag:colon', // Colon in tag
            ];

            invalidEcrUris.forEach(ecrUri => {
                const payload = {
                    UseCaseType: 'MCPServer',
                    MCPParams: {
                        RuntimeParams: {
                            EcrUri: ecrUri
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });
        });

        it('should validate when RuntimeParams is empty (partial update allowed)', () => {
            const payload = {
                MCPParams: {
                    RuntimeParams: {}
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
    });

    describe('Gateway Configuration Validation', () => {
        it('should fail validation with invalid gateway target configuration', () => {
            const payload = {
                UseCaseType: 'MCPServer',
                MCPParams: {
                    GatewayParams: {
                        TargetParams: [
                            {
                                TargetName: 'invalid-target',
                                TargetDescription: 'Invalid target',
                                TargetType: 'lambda',
                                // Missing required LambdaArn for lambda type
                                SchemaUri: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                            }
                        ]
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with empty TargetParams array', () => {
            const payload = {
                UseCaseType: 'MCPServer',
                MCPParams: {
                    GatewayParams: {
                        TargetParams: []
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Additional Properties Validation', () => {
        it('should fail validation with additional properties in root', () => {
            const payload = {
                UseCaseDescription: 'Updated description',
                UseCaseType: 'MCPServer',
                MCPParams: {
                    GatewayParams: {
                        TargetParams: [
                            {
                                TargetName: 'test-target',
                                TargetDescription: 'Test target',
                                TargetType: 'smithyModel',
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
                UseCaseType: 'MCPServer',
                MCPParams: {
                    RuntimeParams: {
                        EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest'
                    },
                    extraProperty: 'not-allowed'
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with additional properties in RuntimeParams', () => {
            const payload = {
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

    describe('Partial Update Scenarios', () => {
        it('should validate partial gateway config update with single target', () => {
            const payload = {
                MCPParams: {
                    GatewayParams: {
                        TargetParams: [
                            {
                                TargetName: 'single-updated-target',
                                TargetDescription: 'Single updated target',
                                TargetType: 'openApiSchema',
                                SchemaUri: 'mcp/schemas/openApiSchema/e9b1801d-2516-40fe-859e-a0c7d81da2f4.json',
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

        it('should validate description-only update with existing config validation', () => {
            const payload = {
                UseCaseDescription: 'Only updating the description, keeping existing config',
                MCPParams: {
                    RuntimeParams: {
                        EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/existing-server:v1.0'
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
    });
});
