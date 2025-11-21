// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { screen } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import MCPGatewayConfiguration from '../MCPGatewayConfiguration';
import { MCPServerSettings } from '../../interfaces/Steps/MCPServerStep';
import {
    MCP_SERVER_CREATION_METHOD,
    GATEWAY_TARGET_TYPES,
    GATEWAY_REST_API_OUTBOUND_AUTH_TYPES
} from '@/utils/constants';

describe('MCPGatewayConfiguration', () => {
    const mockMCPServerData: MCPServerSettings = {
        creationMethod: MCP_SERVER_CREATION_METHOD.GATEWAY,
        ecrConfig: { imageUri: '' },
        targets: [
            {
                id: '1',
                targetName: 'Test Target',
                targetDescription: 'Test Description',
                targetType: GATEWAY_TARGET_TYPES.LAMBDA,
                uploadedSchema: null,
                lambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
                outboundAuth: {
                    authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.API_KEY,
                    providerArn:
                        'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-provider'
                }
            }
        ],
        inError: false
    };

    const mockProps = {
        mcpServerData: mockMCPServerData,
        ...mockFormComponentCallbacks()
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders gateway configuration component', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPGatewayConfiguration {...mockProps} />);

        expect(screen.getByTestId('mcp-gateway-configuration-container')).toBeInTheDocument();
        expect(screen.getByText('Gateway Configuration')).toBeInTheDocument();
    });

    test('displays existing targets', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPGatewayConfiguration {...mockProps} />);

        expect(screen.getByText('Target Configuration 1')).toBeInTheDocument();
    });

    test('displays add target button', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPGatewayConfiguration {...mockProps} />);

        const addButton = cloudscapeWrapper.findButton('[data-testid="add-target-button"]');
        expect(addButton).toBeDefined();
        expect(screen.getByText('Add another target')).toBeInTheDocument();
    });

    test('handles add target action', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPGatewayConfiguration {...mockProps} />);

        const addButton = cloudscapeWrapper.findButton('[data-testid="add-target-button"]');
        addButton?.click();

        expect(mockProps.onChangeFn).toHaveBeenCalledWith({
            targets: expect.arrayContaining([
                mockMCPServerData.targets![0],
                expect.objectContaining({
                    id: expect.any(String),
                    targetName: '',
                    targetDescription: '',
                    targetType: GATEWAY_TARGET_TYPES.LAMBDA,
                    uploadedSchema: null,
                    uploadedSchemaKey: undefined,
                    lambdaArn: '',
                    outboundAuth: {
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
                    }
                })
            ])
        });
    });

    test('handles remove target action', () => {
        const multiTargetData = {
            ...mockMCPServerData,
            targets: [
                mockMCPServerData.targets![0],
                {
                    id: '2',
                    targetName: 'Second Target',
                    targetDescription: 'Second Description',
                    targetType: GATEWAY_TARGET_TYPES.OPEN_API,
                    uploadedSchema: null,
                    lambdaArn: '',
                    outboundAuth: {
                        authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH,
                        providerArn:
                            'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauth2credentialprovider/oauth-provider'
                    }
                }
            ]
        };

        const multiTargetProps = {
            ...mockProps,
            mcpServerData: multiTargetData
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPGatewayConfiguration {...multiTargetProps} />);

        // Should show remove buttons when there are multiple targets
        const removeButton1 = cloudscapeWrapper.findButton('[data-testid="remove-target-1"]');
        const removeButton2 = cloudscapeWrapper.findButton('[data-testid="remove-target-2"]');
        expect(removeButton1).toBeDefined();
        expect(removeButton2).toBeDefined();
    });

    test('handles update target action', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPGatewayConfiguration {...mockProps} />);

        // Find and update target name input
        const nameInput = cloudscapeWrapper.findInput('[data-testid="target-name-input-1"]');
        nameInput?.setInputValue('Updated Target Name');

        expect(mockProps.onChangeFn).toHaveBeenCalledWith({
            targets: [
                expect.objectContaining({
                    ...mockMCPServerData.targets![0],
                    targetName: 'Updated Target Name'
                })
            ]
        });
    });

    test('shows single target without remove button', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPGatewayConfiguration {...mockProps} />);

        // With only one target, remove button should not be visible
        const removeButton = cloudscapeWrapper.findButton('[data-testid="remove-target-1"]');
        expect(removeButton).toBeNull();
    });

    test('shows multiple targets with remove buttons', () => {
        const multiTargetData = {
            ...mockMCPServerData,
            targets: [
                mockMCPServerData.targets![0],
                {
                    id: '2',
                    targetName: 'Second Target',
                    targetDescription: 'Second Description',
                    targetType: GATEWAY_TARGET_TYPES.LAMBDA,
                    uploadedSchema: null,
                    lambdaArn: '',
                    outboundAuth: { authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.API_KEY, providerArn: '' }
                }
            ]
        };

        const multiTargetProps = {
            ...mockProps,
            mcpServerData: multiTargetData
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPGatewayConfiguration {...multiTargetProps} />);

        expect(screen.getByText('Target Configuration 1')).toBeInTheDocument();
        expect(screen.getByText('Target Configuration 2')).toBeInTheDocument();

        // Both targets should have remove buttons when there are multiple
        const removeButton1 = cloudscapeWrapper.findButton('[data-testid="remove-target-1"]');
        const removeButton2 = cloudscapeWrapper.findButton('[data-testid="remove-target-2"]');
        expect(removeButton1).toBeDefined();
        expect(removeButton2).toBeDefined();
    });

    test('handles empty targets array', () => {
        const emptyTargetsProps = {
            ...mockProps,
            mcpServerData: {
                ...mockMCPServerData,
                targets: []
            }
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPGatewayConfiguration {...emptyTargetsProps} />);

        // Should still show the add button
        const addButton = cloudscapeWrapper.findButton('[data-testid="add-target-button"]');
        expect(addButton).toBeDefined();

        // Should not show any target configurations
        expect(screen.queryByText('Target Configuration 1')).not.toBeInTheDocument();
    });
});
