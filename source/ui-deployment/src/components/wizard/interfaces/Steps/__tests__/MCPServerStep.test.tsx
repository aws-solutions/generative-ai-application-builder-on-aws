// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, beforeEach } from 'vitest';
import { MCPServerStep } from '../MCPServerStep';
import {
    MCP_SERVER_CREATION_METHOD,
    GATEWAY_TARGET_TYPES,
    GATEWAY_REST_API_OUTBOUND_AUTH_TYPES
} from '@/utils/constants';

describe('MCPServerStep', () => {
    let mcpServerStep: MCPServerStep;

    beforeEach(() => {
        mcpServerStep = new MCPServerStep();
    });

    test('initializes with correct properties', () => {
        expect(mcpServerStep.id).toBe('mcpServer');
        expect(mcpServerStep.title).toBe('Create MCP Server');
    });

    test('has correct default props', () => {
        expect(mcpServerStep.props.creationMethod).toBe(MCP_SERVER_CREATION_METHOD.GATEWAY);
        expect(mcpServerStep.props.ecrConfig).toEqual({
            imageUri: '',
            environmentVariables: []
        });
        expect(mcpServerStep.props.targets).toBeDefined();
        expect(mcpServerStep.props.targets?.length).toBe(1);
        expect(mcpServerStep.props.inError).toBe(false);
    });

    test('has correct default target configuration', () => {
        const defaultTarget = mcpServerStep.props.targets![0];

        expect(defaultTarget.id).toBe('1');
        expect(defaultTarget.targetName).toBe('');
        expect(defaultTarget.targetDescription).toBe('');
        expect(defaultTarget.targetType).toBe(GATEWAY_TARGET_TYPES.LAMBDA);
        expect(defaultTarget.uploadedSchema).toBeNull();
        expect(defaultTarget.lambdaArn).toBe('');
        expect(defaultTarget.outboundAuth).toEqual({
            authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH,
            providerArn: '',
            additionalConfig: {
                oauthConfig: {
                    scopes: [],
                    customParameters: []
                },
                apiKeyConfig: {
                    parameterName: '',
                    prefix: '',
                    location: 'HEADER'
                }
            }
        });
    });

    test('has correct tool content', () => {
        expect(mcpServerStep.toolContent.title).toBe('MCP Server Configuration');
        expect(mcpServerStep.toolContent.content).toBeDefined();
        expect(mcpServerStep.toolContent.links).toBeDefined();
        expect(mcpServerStep.toolContent.links.length).toBeGreaterThan(0);
    });

    test('has content generator function', () => {
        expect(typeof mcpServerStep.contentGenerator).toBe('function');
    });

    test('maps deployment info correctly for Gateway method', () => {
        const mockDeployment = {
            MCPParams: {
                GatewayParams: {
                    TargetParams: [
                        {
                            TargetId: '2',
                            TargetName: 'Test Target',
                            TargetDescription: 'Test Description',
                            TargetType: GATEWAY_TARGET_TYPES.OPEN_API,
                            SchemaUri: 's3://bucket/schema.json',
                            LambdaArn: '',
                            OutboundAuthParams: {
                                OutboundAuthProviderType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH,
                                OutboundAuthProviderArn: 'arn:aws:provider:test'
                            }
                        }
                    ]
                }
            }
        };

        mcpServerStep.mapStepInfoFromDeployment(mockDeployment);

        expect(mcpServerStep.props.creationMethod).toBe(MCP_SERVER_CREATION_METHOD.GATEWAY);
        expect(mcpServerStep.props.targets).toHaveLength(1);

        const mappedTarget = mcpServerStep.props.targets![0];
        expect(mappedTarget.id).toBe('2');
        expect(mappedTarget.targetName).toBe('Test Target');
        expect(mappedTarget.targetDescription).toBe('Test Description');
        expect(mappedTarget.targetType).toBe(GATEWAY_TARGET_TYPES.OPEN_API);
        expect(mappedTarget.uploadedSchemaKey).toBe('s3://bucket/schema.json');
        expect(mappedTarget.uploadedSchemaFileName).toBe('schema.json');
        expect(mappedTarget.uploadedSchema).toBeNull();
        expect(mappedTarget.outboundAuth.authType).toBe(GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH);
        expect(mappedTarget.outboundAuth.providerArn).toBe('arn:aws:provider:test');
    });

    test('maps deployment info correctly for Runtime method', () => {
        const mockDeployment = {
            MCPParams: {
                RuntimeParams: {
                    EcrUri: 'test-image:latest',
                    EnvironmentVariables: {
                        'VAR1': 'value1',
                        'VAR2': 'value2'
                    }
                }
            }
        };

        mcpServerStep.mapStepInfoFromDeployment(mockDeployment);

        expect(mcpServerStep.props.creationMethod).toBe(MCP_SERVER_CREATION_METHOD.RUNTIME);
        expect(mcpServerStep.props.ecrConfig).toEqual({
            imageUri: 'test-image:latest',
            environmentVariables: [
                { key: 'VAR1', value: 'value1' },
                { key: 'VAR2', value: 'value2' }
            ]
        });
    });

    test('handles empty deployment data', () => {
        const originalProps = { ...mcpServerStep.props };

        mcpServerStep.mapStepInfoFromDeployment(null);

        // Should maintain default values
        expect(mcpServerStep.props).toEqual(originalProps);
    });

    test('handles deployment without MCPParams', () => {
        const originalProps = { ...mcpServerStep.props };

        mcpServerStep.mapStepInfoFromDeployment({});

        // Should maintain default values
        expect(mcpServerStep.props).toEqual(originalProps);
    });

    test('handles partial MCPParams', () => {
        const mockDeployment = {
            MCPParams: {
                GatewayParams: {
                    // Missing TargetParams
                }
            }
        };

        mcpServerStep.mapStepInfoFromDeployment(mockDeployment);

        expect(mcpServerStep.props.creationMethod).toBe(MCP_SERVER_CREATION_METHOD.GATEWAY);
        // Other fields should use fallback to existing values
        expect(mcpServerStep.props.ecrConfig).toBeDefined();
        expect(mcpServerStep.props.targets).toBeDefined();
    });

    test('preserves existing values when deployment fields are undefined', () => {
        const originalEcrConfig = mcpServerStep.props.ecrConfig;
        const originalTargets = mcpServerStep.props.targets;

        const mockDeployment = {
            MCPParams: {
                RuntimeParams: {
                    // Missing EcrUri and EnvironmentVariables
                }
            }
        };

        mcpServerStep.mapStepInfoFromDeployment(mockDeployment);

        expect(mcpServerStep.props.creationMethod).toBe(MCP_SERVER_CREATION_METHOD.RUNTIME);
        expect(mcpServerStep.props.ecrConfig).toEqual({
            imageUri: '',
            environmentVariables: []
        });
        expect(mcpServerStep.props.targets).toBe(originalTargets);
    });

    test('handles complex target configurations', () => {
        const apiTargets = [
            {
                TargetId: '1',
                TargetName: 'Lambda Target',
                TargetDescription: 'Lambda Description',
                TargetType: GATEWAY_TARGET_TYPES.LAMBDA,
                SchemaUri: 's3://bucket/test-schema.json',
                LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
                OutboundAuthParams: {
                    OutboundAuthProviderType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.API_KEY,
                    OutboundAuthProviderArn: 'arn:aws:provider:apikey',
                    AdditionalConfigParams: {
                        ApiKeyAdditionalConfig: {
                            location: 'HEADER',
                            parameterName: 'X-API-Key',
                            prefix: 'Bearer '
                        }
                    }
                }
            },
            {
                TargetId: '2',
                TargetName: 'OpenAPI Target',
                TargetDescription: 'OpenAPI Description',
                TargetType: GATEWAY_TARGET_TYPES.OPEN_API,
                SchemaUri: 's3://bucket/openapi.json',
                OutboundAuthParams: {
                    OutboundAuthProviderType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH,
                    OutboundAuthProviderArn: 'arn:aws:provider:oauth',
                    AdditionalConfigParams: {
                        OAuthAdditionalConfig: {
                            scopes: ['read', 'write'],
                            customParameters: [
                                { key: 'client_id', value: 'client123' },
                                { key: 'audience', value: 'api.example.com' }
                            ]
                        }
                    }
                }
            }
        ];

        const mockDeployment = {
            MCPParams: {
                GatewayParams: {
                    TargetParams: apiTargets
                }
            }
        };

        mcpServerStep.mapStepInfoFromDeployment(mockDeployment);

        expect(mcpServerStep.props.targets).toHaveLength(2);

        // Check first target (Lambda with API Key)
        const lambdaTarget = mcpServerStep.props.targets![0];
        expect(lambdaTarget.id).toBe('1');
        expect(lambdaTarget.targetName).toBe('Lambda Target');
        expect(lambdaTarget.targetType).toBe(GATEWAY_TARGET_TYPES.LAMBDA);
        expect(lambdaTarget.lambdaArn).toBe('arn:aws:lambda:us-east-1:123456789012:function:test');
        expect(lambdaTarget.uploadedSchemaKey).toBe('s3://bucket/test-schema.json');
        expect(lambdaTarget.uploadedSchemaFileName).toBe('test-schema.json');
        expect(lambdaTarget.outboundAuth.authType).toBe(GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.API_KEY);
        expect(lambdaTarget.outboundAuth.additionalConfig.apiKeyConfig.location).toBe('HEADER');
        expect(lambdaTarget.outboundAuth.additionalConfig.apiKeyConfig.parameterName).toBe('X-API-Key');

        // Check second target (OpenAPI with OAuth)
        const openApiTarget = mcpServerStep.props.targets![1];
        expect(openApiTarget.id).toBe('2');
        expect(openApiTarget.targetName).toBe('OpenAPI Target');
        expect(openApiTarget.targetType).toBe(GATEWAY_TARGET_TYPES.OPEN_API);
        expect(openApiTarget.uploadedSchemaFileName).toBe('openapi.json');
        expect(openApiTarget.outboundAuth.authType).toBe(GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH);
        expect(openApiTarget.outboundAuth.providerArn).toBe('arn:aws:provider:oauth');
        expect(openApiTarget.outboundAuth.additionalConfig.oauthConfig.scopes).toEqual(['read', 'write']);
        expect(openApiTarget.outboundAuth.additionalConfig.oauthConfig.customParameters).toHaveLength(2);
    });

    test('handles runtime params with no environment variables', () => {
        const mockDeployment = {
            MCPParams: {
                RuntimeParams: {
                    EcrUri: 'test-image:latest'
                    // No EnvironmentVariables
                }
            }
        };

        mcpServerStep.mapStepInfoFromDeployment(mockDeployment);

        expect(mcpServerStep.props.creationMethod).toBe(MCP_SERVER_CREATION_METHOD.RUNTIME);
        expect(mcpServerStep.props.ecrConfig).toEqual({
            imageUri: 'test-image:latest',
            environmentVariables: []
        });
    });

    test('handles empty target params and creates default target', () => {
        const mockDeployment = {
            MCPParams: {
                GatewayParams: {
                    TargetParams: []
                }
            }
        };

        mcpServerStep.mapStepInfoFromDeployment(mockDeployment);

        expect(mcpServerStep.props.creationMethod).toBe(MCP_SERVER_CREATION_METHOD.GATEWAY);
        expect(mcpServerStep.props.targets).toHaveLength(1);

        const defaultTarget = mcpServerStep.props.targets![0];
        expect(defaultTarget.id).toBe('1');
        expect(defaultTarget.targetName).toBe('');
        expect(defaultTarget.targetType).toBe(GATEWAY_TARGET_TYPES.LAMBDA);
    });

    test('handles missing outbound auth params', () => {
        const mockDeployment = {
            MCPParams: {
                GatewayParams: {
                    TargetParams: [
                        {
                            TargetId: '1',
                            TargetName: 'Test Target',
                            TargetType: GATEWAY_TARGET_TYPES.OPEN_API
                            // No OutboundAuthParams
                        }
                    ]
                }
            }
        };

        mcpServerStep.mapStepInfoFromDeployment(mockDeployment);

        const target = mcpServerStep.props.targets![0];
        expect(target.outboundAuth.authType).toBe(GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH);
        expect(target.outboundAuth.providerArn).toBe('');
        expect(target.outboundAuth.additionalConfig.oauthConfig.scopes).toEqual([]);
    });
});
