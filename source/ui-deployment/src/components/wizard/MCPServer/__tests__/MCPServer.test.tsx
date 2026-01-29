// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { screen } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import { mockFormComponentCallbacks, cloudscapeRender, renderWithProvider } from '@/utils';
import MCPServer from '../MCPServer';
import { MCPServerSettings } from '../../interfaces/Steps/MCPServerStep';
import {
    MCP_SERVER_CREATION_METHOD,
    GATEWAY_TARGET_TYPES,
    GATEWAY_REST_API_OUTBOUND_AUTH_TYPES,
    DEPLOYMENT_ACTIONS
} from '@/utils/constants';

describe('MCPServer', () => {
    const mockMCPServerInfo: MCPServerSettings = {
        creationMethod: MCP_SERVER_CREATION_METHOD.GATEWAY,
        ecrConfig: { imageUri: '' },
        targets: [
            {
                id: '1',
                targetName: '',
                targetDescription: '',
                targetType: GATEWAY_TARGET_TYPES.LAMBDA,
                uploadedSchema: null,
                lambdaArn: '',
                outboundAuth: {
                    authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.API_KEY,
                    providerArn: ''
                }
            }
        ],
        inError: false
    };

    const mockProps = {
        info: {
            mcpServer: mockMCPServerInfo
        },
        ...mockFormComponentCallbacks()
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders MCP Server component', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPServer {...mockProps} />);

        expect(screen.getByTestId('mcp-server-container')).toBeInTheDocument();
        expect(screen.getByText('MCP server creation method')).toBeInTheDocument();
    });

    test('displays creation method radio buttons', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPServer {...mockProps} />);

        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="mcp-creation-method-radio"]');
        expect(radioGroup).toBeDefined();

        const options = radioGroup?.findButtons();
        expect(options).toHaveLength(2);
        expect(radioGroup?.findInputByValue('gateway')).toBeTruthy();
        expect(radioGroup?.findInputByValue('runtime')).toBeTruthy();
    });

    test('handles creation method change', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPServer {...mockProps} />);

        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="mcp-creation-method-radio"]');
        radioGroup?.findInputByValue('runtime')?.click();

        expect(mockProps.onChange).toHaveBeenCalledWith({
            creationMethod: MCP_SERVER_CREATION_METHOD.RUNTIME
        });
    });

    test('shows gateway configuration when gateway method is selected', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPServer {...mockProps} />);

        // Gateway is selected by default, so configuration should be visible
        expect(screen.getByTestId('mcp-gateway-configuration-container')).toBeInTheDocument();
    });

    test('shows runtime configuration when runtime method is selected', () => {
        const runtimeProps = {
            ...mockProps,
            info: {
                mcpServer: {
                    ...mockMCPServerInfo,
                    creationMethod: MCP_SERVER_CREATION_METHOD.RUNTIME
                }
            }
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPServer {...runtimeProps} />);

        expect(screen.getByTestId('mcp-runtime-configuration-container')).toBeInTheDocument();
    });

    test('validates required fields for gateway method', () => {
        const propsWithEmptyTargets = {
            ...mockProps,
            info: {
                mcpServer: {
                    ...mockMCPServerInfo,
                    targets: [
                        {
                            ...mockMCPServerInfo.targets![0],
                            targetName: '',
                            targetDescription: ''
                        }
                    ]
                }
            }
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPServer {...propsWithEmptyTargets} />);

        // Component should call onChange with inError: true for empty required fields
        expect(mockProps.onChange).toHaveBeenCalledWith({ inError: true });
    });

    test('validates required fields for runtime method', () => {
        const runtimePropsWithEmptyUri = {
            ...mockProps,
            info: {
                mcpServer: {
                    ...mockMCPServerInfo,
                    creationMethod: MCP_SERVER_CREATION_METHOD.RUNTIME,
                    ecrConfig: { imageUri: '' }
                }
            }
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPServer {...runtimePropsWithEmptyUri} />);

        // Component should call onChange with inError: true for empty ECR URI
        expect(mockProps.onChange).toHaveBeenCalledWith({ inError: true });
    });

    test('resets error state when creation method changes', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPServer {...mockProps} />);

        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="mcp-creation-method-radio"]');
        radioGroup?.findInputByValue('runtime')?.click();

        // Should reset error state when method changes
        expect(mockProps.onChange).toHaveBeenCalledWith({ inError: false });
    });

    test('disables creation method selection in edit mode', () => {
        const { cloudscapeWrapper } = renderWithProvider(<MCPServer {...mockProps} />, {
            route: '/mcpServer',
            customState: {
                deploymentAction: DEPLOYMENT_ACTIONS.EDIT
            }
        });

        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="mcp-creation-method-radio"]');

        // Both options should be disabled in edit mode
        const gatewayInput = radioGroup?.findInputByValue('gateway');
        const runtimeInput = radioGroup?.findInputByValue('runtime');

        expect(gatewayInput?.getElement().disabled).toBe(true);
        expect(runtimeInput?.getElement().disabled).toBe(true);
    });

    test('shows appropriate description in edit mode', () => {
        renderWithProvider(<MCPServer {...mockProps} />, {
            route: '/mcpServer',
            customState: {
                deploymentAction: DEPLOYMENT_ACTIONS.EDIT
            }
        });

        expect(
            screen.getByText('The creation method cannot be changed when editing an existing MCP server.')
        ).toBeInTheDocument();
    });

    describe('schema validation', () => {
        test('validates schema required for OpenAPI targets', () => {
            const propsWithOpenAPITarget = {
                ...mockProps,
                info: {
                    mcpServer: {
                        ...mockMCPServerInfo,
                        targets: [
                            {
                                id: '1',
                                targetName: 'test-target',
                                targetDescription: 'test description',
                                targetType: GATEWAY_TARGET_TYPES.OPEN_API,
                                uploadedSchema: null,
                                uploadedSchemaKey: '',
                                lambdaArn: '',
                                outboundAuth: {
                                    authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH,
                                    providerArn:
                                        'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test/oauth2credentialprovider/test'
                                }
                            }
                        ]
                    }
                }
            };

            cloudscapeRender(<MCPServer {...propsWithOpenAPITarget} />);

            expect(mockProps.onChange).toHaveBeenCalledWith({ inError: true });
        });

        test('skips schema validation for MCP Server targets', () => {
            const propsWithMCPServerTarget = {
                ...mockProps,
                info: {
                    mcpServer: {
                        ...mockMCPServerInfo,
                        targets: [
                            {
                                id: '1',
                                targetName: 'test-mcp-target',
                                targetDescription: 'test description',
                                targetType: GATEWAY_TARGET_TYPES.MCP_SERVER,
                                uploadedSchema: null,
                                uploadedSchemaKey: '',
                                lambdaArn: '',
                                mcpEndpoint: 'https://api.example.com/mcp',
                                outboundAuth: {
                                    authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH,
                                    providerArn:
                                        'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test/oauth2credentialprovider/test'
                                }
                            }
                        ]
                    }
                }
            };

            cloudscapeRender(<MCPServer {...propsWithMCPServerTarget} />);

            expect(mockProps.onChange).toHaveBeenCalledWith({ inError: false });
        });
    });

    describe('authentication validation', () => {
        test('validates provider ARN required when not NO_AUTH', () => {
            const propsWithMissingProviderArn = {
                ...mockProps,
                info: {
                    mcpServer: {
                        ...mockMCPServerInfo,
                        targets: [
                            {
                                id: '1',
                                targetName: 'test-target',
                                targetDescription: 'test description',
                                targetType: GATEWAY_TARGET_TYPES.MCP_SERVER,
                                uploadedSchema: null,
                                lambdaArn: '',
                                mcpEndpoint: 'https://api.example.com/mcp',
                                outboundAuth: {
                                    authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH,
                                    providerArn: ''
                                }
                            }
                        ]
                    }
                }
            };

            cloudscapeRender(<MCPServer {...propsWithMissingProviderArn} />);

            expect(mockProps.onChange).toHaveBeenCalledWith({ inError: true });
        });

        test('skips provider ARN validation when NO_AUTH selected', () => {
            const propsWithNoAuth = {
                ...mockProps,
                info: {
                    mcpServer: {
                        ...mockMCPServerInfo,
                        targets: [
                            {
                                id: '1',
                                targetName: 'test-target',
                                targetDescription: 'test description',
                                targetType: GATEWAY_TARGET_TYPES.MCP_SERVER,
                                uploadedSchema: null,
                                lambdaArn: '',
                                mcpEndpoint: 'https://api.example.com/mcp',
                                outboundAuth: {
                                    authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.NO_AUTH,
                                    providerArn: ''
                                }
                            }
                        ]
                    }
                }
            };

            cloudscapeRender(<MCPServer {...propsWithNoAuth} />);

            expect(mockProps.onChange).toHaveBeenCalledWith({ inError: false });
        });
    });
});
