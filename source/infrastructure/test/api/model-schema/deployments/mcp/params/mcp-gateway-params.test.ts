// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Validator } from 'jsonschema';
import { gatewayParams } from '../../../../../../lib/api/model-schema/deployments/mcp/params/mcp-gateway-params';
import { checkValidationSucceeded, checkValidationFailed } from '../../../shared/utils';
import {
    MCP_GATEWAY_MAX_TARGETS_PER_GATEWAY,
    MCP_GATEWAY_TARGET_NAME_MAX_LENGTH,
    MCP_GATEWAY_TARGET_DESCRIPTION_MAX_LENGTH,
    OAUTH_SCOPE_MAX_LENGTH,
    OAUTH_SCOPES_MAX_COUNT,
    OAUTH_CUSTOM_PARAM_KEY_MAX_LENGTH,
    OAUTH_CUSTOM_PARAM_VALUE_MAX_LENGTH,
    OAUTH_CUSTOM_PARAMS_MAX_COUNT,
    API_KEY_PARAM_NAME_MAX_LENGTH,
    API_KEY_PREFIX_MAX_LENGTH
} from '../../../../../../lib/utils/constants';

describe('Testing MCP Gateway Parameters schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        schema = gatewayParams;
        validator = new Validator();
    });

    describe('Valid Gateway Configurations', () => {
        it('should validate lambda target with required fields', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-lambda-target',
                        TargetDescription: 'Test Lambda target',
                        TargetType: 'lambda',
                        LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
                        SchemaUri: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate openApiSchema target with API_KEY auth', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-openapi-target',
                        TargetDescription: 'Test OpenAPI target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/f2c3d4e5-6789-40fe-859e-b1c8e92ea4f4.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-api-key',
                            OutboundAuthProviderType: 'API_KEY',
                            AdditionalConfigParams: {
                                ApiKeyAdditionalConfig: {
                                    location: 'HEADER',
                                    parameterName: 'X-API-Key',
                                    prefix: 'Bearer'
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate openApiSchema target with OAUTH auth', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-oauth-target',
                        TargetDescription: 'Test OAuth target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/a3b4c5d6-7890-40fe-859e-c2d9f03fb5a6.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-oauth',
                            OutboundAuthProviderType: 'OAUTH',
                            AdditionalConfigParams: {
                                OAuthAdditionalConfig: {
                                    scopes: ['read', 'write'],
                                    customParameters: [{ key: 'audience', value: 'api.example.com' }]
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate openApiSchema target with minimal auth', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-existing-auth-target',
                        TargetDescription: 'Test existing auth target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/b4c5d6e7-8901-40fe-859e-d3eaf14ac7b8.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-api-key',
                            OutboundAuthProviderType: 'API_KEY'
                        }
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate smithyModel target', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-smithy-target',
                        TargetDescription: 'Test Smithy target',
                        TargetType: 'smithyModel',
                        SchemaUri: 'mcp/schemas/smithyModel/e9b1801d-2516-40fe-859e-a0c7d81da2f3.smithy'
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate multiple targets up to maximum', () => {
            const targets = Array.from({ length: MCP_GATEWAY_MAX_TARGETS_PER_GATEWAY }, (_, i) => {
                const paddedI = String(i).padStart(2, '0');
                return {
                    TargetName: `target-${i + 1}`,
                    TargetDescription: `Test target ${i + 1}`,
                    TargetType: 'lambda',
                    LambdaArn: `arn:aws:lambda:us-east-1:123456789012:function:test-function-${i + 1}`,
                    SchemaUri: `mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2${paddedI}.json`
                };
            });

            const payload = { TargetParams: targets };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
    });

    describe('Invalid Gateway Configurations', () => {
        it('should fail validation when TargetParams array is empty', () => {
            const payload = {
                TargetParams: []
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when TargetParams array exceeds maximum', () => {
            const targets = Array.from({ length: MCP_GATEWAY_MAX_TARGETS_PER_GATEWAY + 1 }, (_, i) => ({
                TargetName: `target-${i + 1}`,
                TargetDescription: `Test target ${i + 1}`,
                TargetType: 'lambda',
                LambdaArn: `arn:aws:lambda:us-east-1:123456789012:function:test-function-${i + 1}`,
                SchemaUri: `mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f${i.toString().padStart(2, '0')}.json`
            }));

            const payload = { TargetParams: targets };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when TargetParams is missing', () => {
            const payload = {};
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with invalid target type', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-target',
                        TargetDescription: 'Test target',
                        TargetType: 'invalid-type',
                        SchemaUri: 'mcp/schemas/invalid/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Target Name Validation', () => {
        it('should fail validation with empty target name', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: '',
                        TargetDescription: 'Test target',
                        TargetType: 'lambda',
                        LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
                        SchemaUri: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with target name exceeding max length', () => {
            const longName = 'a'.repeat(MCP_GATEWAY_TARGET_NAME_MAX_LENGTH + 1); // Exceeds max length limit
            const payload = {
                TargetParams: [
                    {
                        TargetName: longName,
                        TargetDescription: 'Test target',
                        TargetType: 'lambda',
                        LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
                        SchemaUri: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should validate target name with valid characters', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'valid-target_name123',
                        TargetDescription: 'Test target',
                        TargetType: 'lambda',
                        LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
                        SchemaUri: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
    });

    describe('Lambda Target Validation', () => {
        it('should fail validation when lambda target missing LambdaArn', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-lambda-target',
                        TargetDescription: 'Test Lambda target',
                        TargetType: 'lambda',
                        SchemaUri: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with invalid lambda ARN format', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-lambda-target',
                        TargetDescription: 'Test Lambda target',
                        TargetType: 'lambda',
                        LambdaArn: 'invalid-arn-format',
                        SchemaUri: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should validate lambda ARN with version', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-lambda-target',
                        TargetDescription: 'Test Lambda target with version',
                        TargetType: 'lambda',
                        LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function:1',
                        SchemaUri: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
    });

    describe('OpenAPI Target Validation', () => {
        it('should fail validation when openApiSchema target missing OutboundAuthParams', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-openapi-target',
                        TargetDescription: 'Test OpenAPI target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with invalid auth provider type', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-openapi-target',
                        TargetDescription: 'Test OpenAPI target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-oauth',
                            OutboundAuthProviderType: 'INVALID_TYPE'
                        }
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when missing OutboundAuthProviderArn', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-openapi-target',
                        TargetDescription: 'Test OpenAPI target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderType: 'API_KEY'
                        }
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when missing OutboundAuthProviderType', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-openapi-target',
                        TargetDescription: 'Test OpenAPI target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-oauth'
                        }
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with invalid Bedrock AgentCore ARN format for API_KEY', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-openapi-target',
                        TargetDescription: 'Test OpenAPI target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-api-key',
                            OutboundAuthProviderType: 'API_KEY'
                        }
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with invalid Bedrock AgentCore ARN format for OAUTH', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-openapi-target',
                        TargetDescription: 'Test OpenAPI target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-oauth',
                            OutboundAuthProviderType: 'OAUTH'
                        }
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Schema Key Validation', () => {
        it('should validate with valid MCP schema key pattern for smithyModel', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-target',
                        TargetDescription: 'Test target',
                        TargetType: 'smithyModel',
                        SchemaUri: 'mcp/schemas/smithyModel/e9b1801d-2516-40fe-859e-a0c7d81da2f3.smithy'
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate with valid MCP schema key pattern for lambda', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-target',
                        TargetDescription: 'Test target',
                        TargetType: 'lambda',
                        LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
                        SchemaUri: 'mcp/schemas/lambda/f2c3d4e5-6789-40fe-859e-b1c8e92ea4f4.json'
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate with valid MCP schema key pattern for openApiSchema', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-target',
                        TargetDescription: 'Test target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/a3b4c5d6-7890-40fe-859e-c2d9f03fb5a6.yaml',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-api-key',
                            OutboundAuthProviderType: 'API_KEY'
                        }
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should fail validation with empty schema key', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-target',
                        TargetDescription: 'Test target',
                        TargetType: 'lambda',
                        LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
                        SchemaUri: ''
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with invalid schema key format', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-target',
                        TargetDescription: 'Test target',
                        TargetType: 'lambda',
                        LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
                        SchemaUri: 'invalid-schema-key-format'
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('OAuth Configuration Validation', () => {
        it('should validate OAuth scopes within limits', () => {
            const scopes = Array.from({ length: OAUTH_SCOPES_MAX_COUNT }, (_, i) => `scope-${i + 1}`);
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-oauth-target',
                        TargetDescription: 'Test OAuth target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/a3b4c5d6-7890-40fe-859e-c2d9f03fb5a6.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-oauth',
                            OutboundAuthProviderType: 'OAUTH',
                            AdditionalConfigParams: {
                                OAuthAdditionalConfig: {
                                    scopes: scopes
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should fail validation when OAuth scopes exceed maximum count', () => {
            const scopes = Array.from({ length: OAUTH_SCOPES_MAX_COUNT + 1 }, (_, i) => `scope-${i + 1}`);
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-oauth-target',
                        TargetDescription: 'Test OAuth target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/a3b4c5d6-7890-40fe-859e-c2d9f03fb5a6.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-oauth',
                            OutboundAuthProviderType: 'OAUTH',
                            AdditionalConfigParams: {
                                OAuthAdditionalConfig: {
                                    scopes: scopes
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when OAuth scope exceeds maximum length', () => {
            const longScope = 'a'.repeat(OAUTH_SCOPE_MAX_LENGTH + 1);
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-oauth-target',
                        TargetDescription: 'Test OAuth target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/a3b4c5d6-7890-40fe-859e-c2d9f03fb5a6.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-oauth',
                            OutboundAuthProviderType: 'OAUTH',
                            AdditionalConfigParams: {
                                OAuthAdditionalConfig: {
                                    scopes: [longScope]
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should validate OAuth scope when empty (optional)', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-oauth-target',
                        TargetDescription: 'Test OAuth target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/a3b4c5d6-7890-40fe-859e-c2d9f03fb5a6.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-oauth',
                            OutboundAuthProviderType: 'OAUTH',
                            AdditionalConfigParams: {
                                OAuthAdditionalConfig: {
                                    scopes: ['']
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate OAuth custom parameters within limits', () => {
            const customParams = Array.from({ length: OAUTH_CUSTOM_PARAMS_MAX_COUNT }, (_, i) => ({
                key: `param-key-${i + 1}`,
                value: `param-value-${i + 1}`
            }));
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-oauth-target',
                        TargetDescription: 'Test OAuth target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/a3b4c5d6-7890-40fe-859e-c2d9f03fb5a6.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-oauth',
                            OutboundAuthProviderType: 'OAUTH',
                            AdditionalConfigParams: {
                                OAuthAdditionalConfig: {
                                    customParameters: customParams
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should fail validation when OAuth custom parameters exceed maximum count', () => {
            const customParams = Array.from({ length: OAUTH_CUSTOM_PARAMS_MAX_COUNT + 1 }, (_, i) => ({
                key: `param-key-${i + 1}`,
                value: `param-value-${i + 1}`
            }));
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-oauth-target',
                        TargetDescription: 'Test OAuth target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/a3b4c5d6-7890-40fe-859e-c2d9f03fb5a6.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-oauth',
                            OutboundAuthProviderType: 'OAUTH',
                            AdditionalConfigParams: {
                                OAuthAdditionalConfig: {
                                    customParameters: customParams
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when OAuth custom parameter key exceeds maximum length', () => {
            const longKey = 'a'.repeat(OAUTH_CUSTOM_PARAM_KEY_MAX_LENGTH + 1);
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-oauth-target',
                        TargetDescription: 'Test OAuth target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/a3b4c5d6-7890-40fe-859e-c2d9f03fb5a6.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-oauth',
                            OutboundAuthProviderType: 'OAUTH',
                            AdditionalConfigParams: {
                                OAuthAdditionalConfig: {
                                    customParameters: [{ key: longKey, value: 'test-value' }]
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when OAuth custom parameter value exceeds maximum length', () => {
            const longValue = 'a'.repeat(OAUTH_CUSTOM_PARAM_VALUE_MAX_LENGTH + 1);
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-oauth-target',
                        TargetDescription: 'Test OAuth target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/a3b4c5d6-7890-40fe-859e-c2d9f03fb5a6.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-oauth',
                            OutboundAuthProviderType: 'OAUTH',
                            AdditionalConfigParams: {
                                OAuthAdditionalConfig: {
                                    customParameters: [{ key: 'test-key', value: longValue }]
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should validate when both OAuth custom parameter key and value are provided', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-oauth-target',
                        TargetDescription: 'Test OAuth target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/a3b4c5d6-7890-40fe-859e-c2d9f03fb5a6.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-oauth',
                            OutboundAuthProviderType: 'OAUTH',
                            AdditionalConfigParams: {
                                OAuthAdditionalConfig: {
                                    customParameters: [{ key: 'test-key', value: 'test-value' }]
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate when OAuth custom parameters array is empty', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-oauth-target',
                        TargetDescription: 'Test OAuth target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/a3b4c5d6-7890-40fe-859e-c2d9f03fb5a6.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-oauth',
                            OutboundAuthProviderType: 'OAUTH',
                            AdditionalConfigParams: {
                                OAuthAdditionalConfig: {
                                    customParameters: []
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
    });

    describe('API Key Configuration Validation', () => {
        it('should validate API Key parameter name within limits', () => {
            const paramName = 'a'.repeat(API_KEY_PARAM_NAME_MAX_LENGTH);
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-apikey-target',
                        TargetDescription: 'Test API Key target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/f2c3d4e5-6789-40fe-859e-b1c8e92ea4f4.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-api-key',
                            OutboundAuthProviderType: 'API_KEY',
                            AdditionalConfigParams: {
                                ApiKeyAdditionalConfig: {
                                    location: 'HEADER',
                                    parameterName: paramName
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should fail validation when API Key parameter name exceeds maximum length', () => {
            const longParamName = 'a'.repeat(API_KEY_PARAM_NAME_MAX_LENGTH + 1);
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-apikey-target',
                        TargetDescription: 'Test API Key target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/f2c3d4e5-6789-40fe-859e-b1c8e92ea4f4.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-api-key',
                            OutboundAuthProviderType: 'API_KEY',
                            AdditionalConfigParams: {
                                ApiKeyAdditionalConfig: {
                                    location: 'HEADER',
                                    parameterName: longParamName
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should validate API Key parameter name when empty (optional)', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-apikey-target',
                        TargetDescription: 'Test API Key target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/f2c3d4e5-6789-40fe-859e-b1c8e92ea4f4.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-api-key',
                            OutboundAuthProviderType: 'API_KEY',
                            AdditionalConfigParams: {
                                ApiKeyAdditionalConfig: {
                                    location: 'HEADER',
                                    parameterName: ''
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate API Key prefix within limits', () => {
            const prefix = 'a'.repeat(API_KEY_PREFIX_MAX_LENGTH);
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-apikey-target',
                        TargetDescription: 'Test API Key target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/f2c3d4e5-6789-40fe-859e-b1c8e92ea4f4.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-api-key',
                            OutboundAuthProviderType: 'API_KEY',
                            AdditionalConfigParams: {
                                ApiKeyAdditionalConfig: {
                                    location: 'HEADER',
                                    parameterName: 'X-API-Key',
                                    prefix: prefix
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should fail validation when API Key prefix exceeds maximum length', () => {
            const longPrefix = 'a'.repeat(API_KEY_PREFIX_MAX_LENGTH + 1);
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-apikey-target',
                        TargetDescription: 'Test API Key target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/f2c3d4e5-6789-40fe-859e-b1c8e92ea4f4.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-api-key',
                            OutboundAuthProviderType: 'API_KEY',
                            AdditionalConfigParams: {
                                ApiKeyAdditionalConfig: {
                                    location: 'HEADER',
                                    parameterName: 'X-API-Key',
                                    prefix: longPrefix
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should validate API Key with empty prefix (optional field)', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-apikey-target',
                        TargetDescription: 'Test API Key target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/f2c3d4e5-6789-40fe-859e-b1c8e92ea4f4.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-api-key',
                            OutboundAuthProviderType: 'API_KEY',
                            AdditionalConfigParams: {
                                ApiKeyAdditionalConfig: {
                                    location: 'HEADER',
                                    parameterName: 'X-API-Key',
                                    prefix: ''
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should fail validation with invalid API Key location', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-apikey-target',
                        TargetDescription: 'Test API Key target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/f2c3d4e5-6789-40fe-859e-b1c8e92ea4f4.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-api-key',
                            OutboundAuthProviderType: 'API_KEY',
                            AdditionalConfigParams: {
                                ApiKeyAdditionalConfig: {
                                    location: 'INVALID_LOCATION',
                                    parameterName: 'X-API-Key'
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Target Description Validation', () => {
        it('should validate target description within limits', () => {
            const description = 'a'.repeat(MCP_GATEWAY_TARGET_DESCRIPTION_MAX_LENGTH);
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-target',
                        TargetDescription: description,
                        TargetType: 'lambda',
                        LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
                        SchemaUri: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should fail validation when target description exceeds maximum length', () => {
            const longDescription = 'a'.repeat(MCP_GATEWAY_TARGET_DESCRIPTION_MAX_LENGTH + 1);
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-target',
                        TargetDescription: longDescription,
                        TargetType: 'lambda',
                        LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
                        SchemaUri: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Additional Properties Validation', () => {
        it('should fail validation with additional properties in target', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-target',
                        TargetDescription: 'Test target',
                        TargetType: 'lambda',
                        LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
                        SchemaUri: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json',
                        extraProperty: 'not-allowed'
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with additional properties in root', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-target',
                        TargetDescription: 'Test target',
                        TargetType: 'lambda',
                        LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
                        SchemaUri: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json'
                    }
                ],
                extraProperty: 'not-allowed'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with additional properties in OAuth config', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-oauth-target',
                        TargetDescription: 'Test OAuth target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/a3b4c5d6-7890-40fe-859e-c2d9f03fb5a6.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/test-oauth',
                            OutboundAuthProviderType: 'OAUTH',
                            AdditionalConfigParams: {
                                OAuthAdditionalConfig: {
                                    scopes: ['read'],
                                    extraProperty: 'not-allowed'
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with additional properties in API Key config', () => {
            const payload = {
                TargetParams: [
                    {
                        TargetName: 'test-apikey-target',
                        TargetDescription: 'Test API Key target',
                        TargetType: 'openApiSchema',
                        SchemaUri: 'mcp/schemas/openApiSchema/f2c3d4e5-6789-40fe-859e-b1c8e92ea4f4.json',
                        OutboundAuthParams: {
                            OutboundAuthProviderArn:
                                'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-api-key',
                            OutboundAuthProviderType: 'API_KEY',
                            AdditionalConfigParams: {
                                ApiKeyAdditionalConfig: {
                                    location: 'HEADER',
                                    parameterName: 'X-API-Key',
                                    extraProperty: 'not-allowed'
                                }
                            }
                        }
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });
});
