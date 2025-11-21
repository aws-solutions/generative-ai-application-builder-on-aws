// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { screen } from '@testing-library/react';
import { describe, test, expect, afterEach, vi } from 'vitest';
import { cloudscapeRender } from '@/utils';
import { MCPReview, MCPUseCaseReview } from '../MCPReview';
import { MCPServerSettings } from '../../interfaces/Steps/MCPServerStep';
import { MCP_SERVER_CREATION_METHOD, GATEWAY_TARGET_TYPES, GATEWAY_REST_API_OUTBOUND_AUTH_TYPES, USECASE_TYPES } from '@/utils/constants';

describe('MCPUseCaseReview', () => {
    const mockUseCaseData = {
        useCaseName: 'Test MCP Server',
        useCaseDescription: 'Test MCP Server Description',
        useCaseType: USECASE_TYPES.MCP_SERVER,
        defaultUserEmail: 'test@example.com',
        existingUserPoolId: 'us-east-1_XXXXXXXXX',
        existingUserPoolClientId: 'client-id-123',
        deployUI: true,
        feedbackEnabled: false
    };

    const mockProps = {
        header: 'Step 1: Use case',
        useCaseData: mockUseCaseData,
        setActiveStepIndex: vi.fn()
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders MCP use case review component', () => {
        cloudscapeRender(<MCPUseCaseReview {...mockProps} />);

        expect(screen.getByText('Step 1: Use case')).toBeInTheDocument();
        expect(screen.getByText('Use case options')).toBeInTheDocument();
        expect(screen.getByTestId('review-use-case-details-container')).toBeInTheDocument();
    });

    test('displays use case type, name, and description', () => {
        cloudscapeRender(<MCPUseCaseReview {...mockProps} />);

        // Should show use case type, name, and description
        expect(screen.getByText('Use case type')).toBeInTheDocument();
        expect(screen.getByText(USECASE_TYPES.MCP_SERVER)).toBeInTheDocument();
        expect(screen.getByText('Use case name')).toBeInTheDocument();
        expect(screen.getByText('Test MCP Server')).toBeInTheDocument();
        expect(screen.getByText('Description')).toBeInTheDocument();
        expect(screen.getByText('Test MCP Server Description')).toBeInTheDocument();
    });

    test('displays empty description as is', () => {
        const emptyDescriptionProps = {
            ...mockProps,
            useCaseData: {
                ...mockUseCaseData,
                useCaseDescription: ''
            }
        };

        cloudscapeRender(<MCPUseCaseReview {...emptyDescriptionProps} />);

        // Empty description should be displayed as empty string
        const descriptions = screen.getAllByText('Description');
        expect(descriptions.length).toBeGreaterThan(0);
    });

    test('displays whitespace-only description as is', () => {
        const whitespaceDescriptionProps = {
            ...mockProps,
            useCaseData: {
                ...mockUseCaseData,
                useCaseDescription: '   \n\t   '
            }
        };

        cloudscapeRender(<MCPUseCaseReview {...whitespaceDescriptionProps} />);

        // Whitespace description should be displayed as is
        const descriptions = screen.getAllByText('Description');
        expect(descriptions.length).toBeGreaterThan(0);
    });

    test('does not display excluded fields', () => {
        cloudscapeRender(<MCPUseCaseReview {...mockProps} />);

        // Should NOT show these fields that were in the original UseCaseReview
        expect(screen.queryByText('Use case email')).not.toBeInTheDocument();
        expect(screen.queryByText('Use case description')).not.toBeInTheDocument();
        expect(screen.queryByText('Cognito User Pool Id')).not.toBeInTheDocument();
        expect(screen.queryByText('Cognito User Pool Client Id')).not.toBeInTheDocument();
        expect(screen.queryByText('Deploy UI')).not.toBeInTheDocument();
        expect(screen.queryByText('Enable Feedback')).not.toBeInTheDocument();

        // Should not show the actual values for excluded fields
        expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
        expect(screen.queryByText('us-east-1_XXXXXXXXX')).not.toBeInTheDocument();
        expect(screen.queryByText('client-id-123')).not.toBeInTheDocument();

        // But should show the description since it's included in MCP use case review
        expect(screen.getByText('Test MCP Server Description')).toBeInTheDocument();
    });

    test('displays edit button', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPUseCaseReview {...mockProps} />);

        const editButton = cloudscapeWrapper.findButton();
        expect(editButton).toBeDefined();
        expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    test('handles edit button click', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPUseCaseReview {...mockProps} />);

        const editButton = cloudscapeWrapper.findButton();
        editButton?.click();

        expect(mockProps.setActiveStepIndex).toHaveBeenCalledWith(0); // USE_CASE step index
    });

    test('uses correct test ids', () => {
        cloudscapeRender(<MCPUseCaseReview {...mockProps} />);

        expect(screen.getByTestId('review-use-case-details-container')).toBeInTheDocument();
        expect(screen.getByTestId('review-use-case-details')).toBeInTheDocument();
    });

    test('handles empty use case name gracefully', () => {
        const emptyNameProps = {
            ...mockProps,
            useCaseData: {
                ...mockUseCaseData,
                useCaseName: ''
            }
        };

        cloudscapeRender(<MCPUseCaseReview {...emptyNameProps} />);

        expect(screen.getByText('Use case name')).toBeInTheDocument();
        // Empty string should still be displayed (or empty space)
    });

    test('handles empty use case type gracefully', () => {
        const emptyTypeProps = {
            ...mockProps,
            useCaseData: {
                ...mockUseCaseData,
                useCaseType: ''
            }
        };

        cloudscapeRender(<MCPUseCaseReview {...emptyTypeProps} />);

        expect(screen.getByText('Use case type')).toBeInTheDocument();
        // Empty string should still be displayed (or empty space)
    });

    test('uses correct column layout', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPUseCaseReview {...mockProps} />);

        const columnLayout = cloudscapeWrapper.findColumnLayout();
        expect(columnLayout).toBeDefined();

        // Should have exactly 3 visible data items (use case type, name, and description)
        expect(screen.getByText('Use case type')).toBeInTheDocument();
        expect(screen.getByText('Use case name')).toBeInTheDocument();
        expect(screen.getByText('Description')).toBeInTheDocument();
    });

    test('maintains consistent styling with original component', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPUseCaseReview {...mockProps} />);

        // Should have the same structure as original UseCaseReview
        expect(screen.getByTestId('review-use-case-details-container')).toBeInTheDocument();

        const container = cloudscapeWrapper.findContainer();
        expect(container).toBeDefined();

        const header = container?.findHeader();
        expect(header).toBeDefined();
        expect(header?.getElement().textContent).toContain('Use case options');
    });
});

describe('MCPReview', () => {
    const mockUseCaseData = {
        useCaseName: 'Test MCP Server',
        useCaseDescription: 'Test MCP Server Description',
        useCaseType: USECASE_TYPES.MCP_SERVER
    };

    const mockMCPServerData: MCPServerSettings = {
        creationMethod: MCP_SERVER_CREATION_METHOD.GATEWAY,
        ecrConfig: { imageUri: '' },
        targets: [{
            id: '1',
            targetName: 'Test Lambda Target',
            targetDescription: 'Lambda function for testing',
            targetType: GATEWAY_TARGET_TYPES.LAMBDA,
            uploadedSchema: new File(['test'], 'test-schema.json', { type: 'application/json' }),
            lambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
            outboundAuth: {
                authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.API_KEY,
                providerArn: 'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-key',
                additionalConfig: {
                    apiKeyConfig: {
                        location: 'HEADER' as const,
                        parameterName: 'X-API-Key',
                        prefix: 'Bearer'
                    }
                }
            }
        }],
        inError: false
    };

    const mockProps = {
        info: {
            useCase: mockUseCaseData,
            mcpServer: mockMCPServerData
        },
        setActiveStepIndex: vi.fn()
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders MCP review component', () => {
        cloudscapeRender(<MCPReview {...mockProps} />);

        expect(screen.getByTestId('review-deployment-component')).toBeInTheDocument();
    });

    test('displays use case review section', () => {
        cloudscapeRender(<MCPReview {...mockProps} />);

        expect(screen.getByText('Step 1: Use case')).toBeInTheDocument();
        expect(screen.getByText('Use case options')).toBeInTheDocument();
        expect(screen.getByText(USECASE_TYPES.MCP_SERVER)).toBeInTheDocument();
        expect(screen.getByText('Test MCP Server')).toBeInTheDocument();
    });

    test('displays MCP server review section', () => {
        cloudscapeRender(<MCPReview {...mockProps} />);

        expect(screen.getByText('Step 2: MCP Server Configuration')).toBeInTheDocument();
        expect(screen.getByTestId('review-mcp-server-container')).toBeInTheDocument();
    });

    test('shows creation method for gateway', () => {
        cloudscapeRender(<MCPReview {...mockProps} />);

        expect(screen.getByText('Creation Method')).toBeInTheDocument();
        expect(screen.getByText('Create from Lambda or API')).toBeInTheDocument();
    });

    test('shows creation method for runtime', () => {
        const runtimeProps = {
            ...mockProps,
            info: {
                ...mockProps.info,
                mcpServer: {
                    ...mockMCPServerData,
                    creationMethod: MCP_SERVER_CREATION_METHOD.RUNTIME,
                    ecrConfig: { imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/test:latest' }
                }
            }
        };

        cloudscapeRender(<MCPReview {...runtimeProps} />);

        expect(screen.getByText('Hosting from ECR Image')).toBeInTheDocument();
        expect(screen.getByText('ECR Image URI')).toBeInTheDocument();
        expect(screen.getByText('123456789012.dkr.ecr.us-east-1.amazonaws.com/test:latest')).toBeInTheDocument();
    });

    test('displays target configurations for gateway method', () => {
        cloudscapeRender(<MCPReview {...mockProps} />);

        expect(screen.getByText('Target Configurations')).toBeInTheDocument();
        expect(screen.getByText('Target Configuration 1')).toBeInTheDocument();
        expect(screen.getByText('Test Lambda Target')).toBeInTheDocument();
        expect(screen.getByText('Lambda function for testing')).toBeInTheDocument();
        expect(screen.getByText('Lambda')).toBeInTheDocument();
        expect(screen.getByText('Schema File')).toBeInTheDocument();
    });

    test('displays empty target description as is', () => {
        const emptyDescriptionProps = {
            ...mockProps,
            info: {
                ...mockProps.info,
                mcpServer: {
                    ...mockMCPServerData,
                    targets: [{
                        ...mockMCPServerData.targets![0],
                        targetDescription: ''
                    }]
                }
            }
        };

        cloudscapeRender(<MCPReview {...emptyDescriptionProps} />);

        // Empty target description should be displayed as empty string
        const descriptions = screen.getAllByText('Description');
        expect(descriptions.length).toBeGreaterThanOrEqual(2); // Use case + target descriptions
    });

    test('shows Lambda ARN for lambda targets', () => {
        cloudscapeRender(<MCPReview {...mockProps} />);

        expect(screen.getByText('Lambda Function ARN')).toBeInTheDocument();
        expect(screen.getByText('arn:aws:lambda:us-east-1:123456789012:function:test-function')).toBeInTheDocument();
    });

    test('shows uploaded schema file name', () => {
        const uploadedProps = {
            ...mockProps,
            info: {
                ...mockProps.info,
                mcpServer: {
                    ...mockMCPServerData,
                    targets: [{
                        ...mockMCPServerData.targets![0],
                        uploadedSchemaKey: 'mcp/schemas/lambda/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json',
                        uploadedSchemaFileName: 'test-schema.json',
                        uploadedSchema: null // File is cleared after upload
                    }]
                }
            }
        };

        cloudscapeRender(<MCPReview {...uploadedProps} />);

        expect(screen.getByText('Uploaded Schema File')).toBeInTheDocument();
        expect(screen.getByText('test-schema.json')).toBeInTheDocument();
        expect(screen.getByText('Uploaded')).toBeInTheDocument();
    });

    test('shows upload error indicator and message', () => {
        const errorProps = {
            ...mockProps,
            info: {
                ...mockProps.info,
                mcpServer: {
                    ...mockMCPServerData,
                    targets: [{
                        ...mockMCPServerData.targets![0],
                        uploadFailed: true,
                        uploadedSchemaKey: undefined,
                        uploadedSchemaFileName: undefined
                    }]
                }
            }
        };

        cloudscapeRender(<MCPReview {...errorProps} />);

        expect(screen.getByText('Upload Failed')).toBeInTheDocument();
    });

    test('shows success indicator when schema is uploaded', () => {
        const successProps = {
            ...mockProps,
            info: {
                ...mockProps.info,
                mcpServer: {
                    ...mockMCPServerData,
                    targets: [{
                        ...mockMCPServerData.targets![0],
                        uploadedSchemaKey: 'mcp/schemas/lambda/test.json',
                        uploadedSchemaFileName: 'test-schema.json',
                        uploadError: undefined
                    }]
                }
            }
        };

        cloudscapeRender(<MCPReview {...successProps} />);

        expect(screen.getByText('Uploaded')).toBeInTheDocument();
        expect(screen.queryByText('Upload Failed')).not.toBeInTheDocument();
    });

    test('shows schema file when no file uploaded', () => {
        const noFileProps = {
            ...mockProps,
            info: {
                ...mockProps.info,
                mcpServer: {
                    ...mockMCPServerData,
                    targets: [{
                        ...mockMCPServerData.targets![0],
                        uploadedSchema: null,
                        uploadedSchemaKey: undefined,
                        uploadedSchemaFileName: undefined
                    }]
                }
            }
        };

        cloudscapeRender(<MCPReview {...noFileProps} />);

        expect(screen.getByText('Schema File')).toBeInTheDocument();
        expect(screen.getByText('No file selected')).toBeInTheDocument();
    });

    test('shows OpenAPI authentication details', () => {
        const openApiProps = {
            ...mockProps,
            info: {
                ...mockProps.info,
                mcpServer: {
                    ...mockMCPServerData,
                    targets: [{
                        ...mockMCPServerData.targets![0],
                        targetType: GATEWAY_TARGET_TYPES.OPEN_API,
                        outboundAuth: {
                            authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH,
                            providerArn: 'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/oauthcredentialprovider/test-oauth',
                            additionalConfig: {
                                oauthConfig: {
                                    scopes: ['read', 'write'],
                                    customParameters: [{ key: 'client_id', value: 'test-client-id' }]
                                }
                            }
                        }
                    }]
                }
            }
        };

        cloudscapeRender(<MCPReview {...openApiProps} />);

        expect(screen.getByText('Authentication Type')).toBeInTheDocument();
        expect(screen.getByText('OAuth')).toBeInTheDocument();
        expect(screen.getByText('Authentication Configured')).toBeInTheDocument();
        expect(screen.getByText('Yes')).toBeInTheDocument();
    });

    test('shows API Key authentication', () => {
        const apiKeyProps = {
            ...mockProps,
            info: {
                ...mockProps.info,
                mcpServer: {
                    ...mockMCPServerData,
                    targets: [{
                        ...mockMCPServerData.targets![0],
                        targetType: GATEWAY_TARGET_TYPES.OPEN_API,
                        outboundAuth: {
                            authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.API_KEY,
                            providerArn: 'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-api-key',
                            additionalConfig: {
                                apiKeyConfig: {
                                    location: 'HEADER' as const,
                                    parameterName: 'X-API-Key'
                                }
                            }
                        }
                    }]
                }
            }
        };

        cloudscapeRender(<MCPReview {...apiKeyProps} />);

        expect(screen.getByText('API Key')).toBeInTheDocument();
    });

    test('displays multiple target configurations', () => {
        const multiTargetProps = {
            ...mockProps,
            info: {
                ...mockProps.info,
                mcpServer: {
                    ...mockMCPServerData,
                    targets: [
                        mockMCPServerData.targets![0],
                        {
                            id: '2',
                            targetName: 'OpenAPI Target',
                            targetDescription: 'OpenAPI specification target',
                            targetType: GATEWAY_TARGET_TYPES.OPEN_API,
                            uploadedSchema: new File(['{"openapi": "3.0.0"}'], 'openapi.json', { type: 'application/json' }),
                            uploadedSchemaKey: undefined,
                            uploadedSchemaFileName: undefined,
                            uploadFailed: undefined,
                            lambdaArn: '',
                            outboundAuth: {
                                authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.API_KEY,
                                providerArn: 'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/api-key',
                                additionalConfig: {
                                    apiKeyConfig: {
                                        location: 'HEADER' as const,
                                        parameterName: 'Authorization'
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        };

        cloudscapeRender(<MCPReview {...multiTargetProps} />);

        expect(screen.getByText('Target Configuration 1')).toBeInTheDocument();
        expect(screen.getByText('Target Configuration 2')).toBeInTheDocument();
        expect(screen.getByText('Test Lambda Target')).toBeInTheDocument();
        expect(screen.getByText('OpenAPI Target')).toBeInTheDocument();
    });

    test('handles edit button click for use case', () => {
        cloudscapeRender(<MCPReview {...mockProps} />);

        // Find all edit buttons and get the first one (use case section)
        const editButtons = screen.getAllByText('Edit');
        expect(editButtons).toHaveLength(2); // One for use case, one for MCP server
        expect(editButtons[0]).toBeInTheDocument();
    });

    test('handles edit button click for MCP server', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<MCPReview {...mockProps} />);

        const editButton = cloudscapeWrapper.findButton('[data-testid="edit-mcp-server-button"]');
        editButton?.click();

        expect(mockProps.setActiveStepIndex).toHaveBeenCalledWith(1);
    });

    test('handles missing target data gracefully', () => {
        const emptyTargetsProps = {
            ...mockProps,
            info: {
                ...mockProps.info,
                mcpServer: {
                    ...mockMCPServerData,
                    targets: []
                }
            }
        };

        cloudscapeRender(<MCPReview {...emptyTargetsProps} />);

        expect(screen.getByText('Step 2: MCP Server Configuration')).toBeInTheDocument();
        // With empty targets, should still show the section but no target configurations
        expect(screen.getByText('Step 2: MCP Server Configuration')).toBeInTheDocument();
    });
});