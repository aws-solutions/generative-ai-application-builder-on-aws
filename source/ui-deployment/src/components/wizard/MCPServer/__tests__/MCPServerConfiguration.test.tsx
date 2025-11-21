// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { screen } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import MCPServerConfiguration from '../MCPServerConfiguration';
import { MCPServerSettings } from '../../interfaces/Steps/MCPServerStep';
import {
    MCP_SERVER_CREATION_METHOD,
    GATEWAY_TARGET_TYPES,
    GATEWAY_REST_API_OUTBOUND_AUTH_TYPES
} from '@/utils/constants';

describe('MCPServerConfiguration', () => {
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

    test('renders gateway configuration for gateway creation method', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPServerConfiguration {...mockProps} />);

        expect(screen.getByTestId('mcp-gateway-configuration-container')).toBeInTheDocument();
        expect(screen.getByText('Gateway Configuration')).toBeInTheDocument();
    });

    test('renders runtime configuration for runtime creation method', () => {
        const runtimeProps = {
            ...mockProps,
            mcpServerData: {
                ...mockMCPServerData,
                creationMethod: MCP_SERVER_CREATION_METHOD.RUNTIME,
                ecrConfig: { imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/test:latest' }
            }
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPServerConfiguration {...runtimeProps} />);

        expect(screen.getByTestId('mcp-runtime-configuration-container')).toBeInTheDocument();
        expect(screen.getByText('ECR Configuration')).toBeInTheDocument();
    });

    test('resets error state on mount', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPServerConfiguration {...mockProps} />);

        expect(mockProps.onChangeFn).toHaveBeenCalledWith({ inError: false });
    });

    test('handles invalid creation method gracefully', () => {
        const invalidProps = {
            ...mockProps,
            mcpServerData: {
                ...mockMCPServerData,
                creationMethod: 'invalid' as any
            }
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPServerConfiguration {...invalidProps} />);

        expect(screen.getByText('Invalid creation method')).toBeInTheDocument();
    });

    test('passes correct props to gateway configuration', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPServerConfiguration {...mockProps} />);

        // Gateway configuration should be rendered with the correct data
        expect(screen.getByTestId('mcp-gateway-configuration-container')).toBeInTheDocument();

        // Should show the target from the mock data
        expect(screen.getByText('Target Configuration 1')).toBeInTheDocument();
    });

    test('passes correct props to runtime configuration', () => {
        const runtimeProps = {
            ...mockProps,
            mcpServerData: {
                ...mockMCPServerData,
                creationMethod: MCP_SERVER_CREATION_METHOD.RUNTIME,
                ecrConfig: { imageUri: 'test-image-uri' }
            }
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPServerConfiguration {...runtimeProps} />);

        // Runtime configuration should be rendered with the correct data
        expect(screen.getByTestId('mcp-runtime-configuration-container')).toBeInTheDocument();

        // Should show the ECR input field
        expect(screen.getByTestId('mcp-ecr-uri-input')).toBeInTheDocument();
    });

    test('handles undefined mcpServerData gracefully', () => {
        const undefinedProps = {
            ...mockProps,
            mcpServerData: {
                creationMethod: MCP_SERVER_CREATION_METHOD.GATEWAY,
                ecrConfig: { imageUri: '' },
                targets: [],
                inError: false
            }
        };

        // This should not crash the component
        expect(() => {
            cloudscapeRender(<MCPServerConfiguration {...undefinedProps} />);
        }).not.toThrow();
    });

    test('switches between configurations when creation method changes', () => {
        const { cloudscapeWrapper, rerender } = cloudscapeRender(<MCPServerConfiguration {...mockProps} />);

        // Initially should show gateway configuration
        expect(screen.getByTestId('mcp-gateway-configuration-container')).toBeInTheDocument();
        expect(screen.queryByTestId('mcp-runtime-configuration-container')).not.toBeInTheDocument();

        // Change to runtime method
        const runtimeProps = {
            ...mockProps,
            mcpServerData: {
                ...mockMCPServerData,
                creationMethod: MCP_SERVER_CREATION_METHOD.RUNTIME
            }
        };

        rerender(<MCPServerConfiguration {...runtimeProps} />);

        // Should now show runtime configuration
        expect(screen.queryByTestId('mcp-gateway-configuration-container')).not.toBeInTheDocument();
        expect(screen.getByTestId('mcp-runtime-configuration-container')).toBeInTheDocument();
    });
});
