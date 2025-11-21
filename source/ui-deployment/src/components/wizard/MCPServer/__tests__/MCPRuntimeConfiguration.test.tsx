// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { screen } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import MCPRuntimeConfiguration from '../MCPRuntimeConfiguration';
import { MCPServerSettings } from '../../interfaces/Steps/MCPServerStep';
import { MCP_SERVER_CREATION_METHOD } from '@/utils/constants';

describe('MCPRuntimeConfiguration', () => {
    const mockMCPServerData: MCPServerSettings = {
        creationMethod: MCP_SERVER_CREATION_METHOD.RUNTIME,
        ecrConfig: {
            imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest'
        },
        targets: [],
        inError: false
    };

    const mockProps = {
        mcpServerData: mockMCPServerData,
        ...mockFormComponentCallbacks()
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders runtime configuration component', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPRuntimeConfiguration {...mockProps} />);

        expect(screen.getByTestId('mcp-runtime-configuration-container')).toBeInTheDocument();
        expect(screen.getByText('ECR Configuration')).toBeInTheDocument();
    });

    test('displays ECR Image URI field', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPRuntimeConfiguration {...mockProps} />);

        expect(screen.getByTestId('mcp-ecr-uri-field')).toBeInTheDocument();
        // The text is split across elements, so check for the parts
        expect(screen.getByText('ECR Image URI -')).toBeInTheDocument();
        expect(screen.getByText('required')).toBeInTheDocument();

        const input = cloudscapeWrapper.findInput('[data-testid="mcp-ecr-uri-input"]');
        expect(input?.getInputValue()).toBe('123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest');
    });

    test('handles ECR Image URI change', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPRuntimeConfiguration {...mockProps} />);

        const input = cloudscapeWrapper.findInput('[data-testid="mcp-ecr-uri-input"]');
        input?.setInputValue('123456789012.dkr.ecr.us-west-2.amazonaws.com/new-mcp-server:v2');

        expect(mockProps.onChangeFn).toHaveBeenCalledWith({
            ecrConfig: {
                ...mockMCPServerData.ecrConfig,
                imageUri: '123456789012.dkr.ecr.us-west-2.amazonaws.com/new-mcp-server:v2'
            }
        });
    });

    test('validates required ECR Image URI field', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPRuntimeConfiguration {...mockProps} />);

        const input = cloudscapeWrapper.findInput('[data-testid="mcp-ecr-uri-input"]');

        // Clear the field to trigger validation
        input?.setInputValue('');

        expect(mockProps.onChangeFn).toHaveBeenCalled();
    });

    test('shows validation error for empty ECR Image URI', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPRuntimeConfiguration {...mockProps} />);

        const input = cloudscapeWrapper.findInput('[data-testid="mcp-ecr-uri-input"]');

        // Set and then clear the field to trigger validation
        input?.setInputValue('test');
        input?.setInputValue('');

        // Check that error tracking function was called
        expect(mockProps.setNumFieldsInError).toHaveBeenCalled();
    });

    test('clears validation error when valid URI is entered', () => {
        const emptyUriProps = {
            ...mockProps,
            mcpServerData: {
                ...mockMCPServerData,
                ecrConfig: { imageUri: '' }
            }
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPRuntimeConfiguration {...emptyUriProps} />);

        const input = cloudscapeWrapper.findInput('[data-testid="mcp-ecr-uri-input"]');

        // Enter a valid URI
        input?.setInputValue('123456789012.dkr.ecr.us-east-1.amazonaws.com/valid-server:latest');

        expect(mockProps.onChangeFn).toHaveBeenCalledWith({
            ecrConfig: {
                imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/valid-server:latest'
            }
        });
    });

    test('displays correct placeholder text', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPRuntimeConfiguration {...mockProps} />);

        const input = cloudscapeWrapper.findInput('[data-testid="mcp-ecr-uri-input"]');
        expect(input?.findNativeInput().getElement().placeholder).toBe(
            '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest'
        );
    });

    test('displays correct description text', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPRuntimeConfiguration {...mockProps} />);

        expect(
            screen.getByText('The URI of the Docker image in Amazon ECR containing your MCP server.')
        ).toBeInTheDocument();
    });

    test('handles undefined ecrConfig', () => {
        const undefinedConfigProps = {
            ...mockProps,
            mcpServerData: {
                ...mockMCPServerData,
                ecrConfig: undefined
            }
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPRuntimeConfiguration {...undefinedConfigProps} />);

        const input = cloudscapeWrapper.findInput('[data-testid="mcp-ecr-uri-input"]');
        expect(input?.getInputValue()).toBe('');
    });

    test('shows region validation error when ECR region mismatches current region', () => {
        const propsWithRegion = {
            ...mockProps,
            currentRegion: 'us-west-2'
        };

        const { cloudscapeWrapper } = cloudscapeRender(<MCPRuntimeConfiguration {...propsWithRegion} />);

        const input = cloudscapeWrapper.findInput('[data-testid="mcp-ecr-uri-input"]');

        // Set ECR URI with different region than current region
        input?.setInputValue('123456789012.dkr.ecr.us-east-1.amazonaws.com/my-server:latest');

        expect(mockProps.setNumFieldsInError).toHaveBeenCalled();

        // Clear error by setting matching region
        input?.setInputValue('123456789012.dkr.ecr.us-west-2.amazonaws.com/my-server:latest');

        expect(mockProps.onChangeFn).toHaveBeenCalledWith({
            ecrConfig: {
                ...mockMCPServerData.ecrConfig,
                imageUri: '123456789012.dkr.ecr.us-west-2.amazonaws.com/my-server:latest'
            }
        });
    });

    describe('Environment Variables', () => {
        test('displays environment variables section and handles basic operations', () => {
            const { cloudscapeWrapper } = cloudscapeRender(<MCPRuntimeConfiguration {...mockProps} />);

            expect(screen.getByText('Environment variables')).toBeInTheDocument();
            expect(
                screen.getByText(
                    'Specify key-value pairs to configure the runtime behavior of the agent. These variables can be used to pass settings, credentials, or custom flags to the container at startup.'
                )
            ).toBeInTheDocument();

            // Test adding environment variable
            const addButton = cloudscapeWrapper.findButton('[data-testid="add-environment-variable"]');
            addButton?.click();

            expect(mockProps.onChangeFn).toHaveBeenCalledWith({
                ecrConfig: {
                    ...mockMCPServerData.ecrConfig,
                    environmentVariables: [{ key: '', value: '' }]
                }
            });
        });

        test('validates environment variables on blur', () => {
            const propsWithEnvVars = {
                ...mockProps,
                mcpServerData: {
                    ...mockMCPServerData,
                    ecrConfig: {
                        ...mockMCPServerData.ecrConfig,
                        environmentVariables: [{ key: '123_INVALID', value: '' }]
                    }
                }
            };

            const { cloudscapeWrapper } = cloudscapeRender(<MCPRuntimeConfiguration {...propsWithEnvVars} />);

            const keyInput = cloudscapeWrapper.findInput('[data-testid="env-var-key-0"]');
            keyInput?.blur();

            // Should call setNumFieldsInError due to validation errors
            expect(mockProps.setNumFieldsInError).toHaveBeenCalled();
        });
    });
});
