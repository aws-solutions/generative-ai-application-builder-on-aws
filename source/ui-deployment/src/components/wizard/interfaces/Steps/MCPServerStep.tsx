// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { IG_DOCS } from '@/utils/constants';
import { Box } from '@cloudscape-design/components';
import { v4 as uuidv4 } from 'uuid';

import { StepContentProps, ToolHelpPanelContent } from '../Steps';
import { BaseWizardProps, BaseWizardStep } from './BaseWizardStep';
import MCPServer from '../../MCPServer';
import {
    MCP_SERVER_CREATION_METHOD,
    GATEWAY_TARGET_TYPES,
    GATEWAY_REST_API_OUTBOUND_AUTH_TYPES,
    API_KEY_LOCATION
} from '@/utils/constants';

export interface MCPServerSettings extends BaseWizardProps {
    creationMethod: MCP_SERVER_CREATION_METHOD;

    // For ECR hosting
    ecrConfig?: {
        imageUri?: string;
        environmentVariables?: Array<{ key: string; value: string }>;
    };

    // For Create from Lambda/API - multiple targets
    targets?: TargetConfiguration[];

    // Track original target IDs from deployment (for edit mode)
    originalTargetIds?: string[];

    // Gateway-level information (for edit mode)
    gatewayInfo?: {
        gatewayId?: string;
        gatewayArn?: string;
        gatewayUrl?: string;
        gatewayName?: string;
    };
}

interface CustomParameter {
    key: string;
    value: string;
}

interface AdditionalConfig {
    oauthConfig?: {
        scopes?: string[];
        customParameters?: CustomParameter[];
    };
    apiKeyConfig?: {
        location?: 'HEADER' | 'QUERY_PARAMETER';
        parameterName?: string;
        prefix?: string;
    };
}

export interface TargetConfiguration {
    id: string;
    targetName: string;
    targetDescription: string;
    targetType: GATEWAY_TARGET_TYPES;

    // Common schema configuration
    uploadedSchema: File | null;
    uploadedSchemaKey?: string;
    uploadedSchemaFileName?: string;
    uploadFailed?: boolean;
    // Lambda specific
    lambdaArn?: string;
    // MCP Server specific
    mcpEndpoint?: string;
    // OpenAPI specific - outbound auth
    outboundAuth?: {
        authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES;
        providerArn?: string;
        additionalConfig?: AdditionalConfig;
    };
}

export class MCPServerStep extends BaseWizardStep {
    public id: string = 'mcpServer';
    public title: string = 'Create MCP Server';

    public props: MCPServerSettings = {
        creationMethod: MCP_SERVER_CREATION_METHOD.GATEWAY,
        ecrConfig: {
            imageUri: '',
            environmentVariables: []
        },
        targets: [
            {
                id: '1',
                targetName: '',
                targetDescription: '',
                targetType: GATEWAY_TARGET_TYPES.LAMBDA,
                uploadedSchema: null,
                uploadedSchemaKey: undefined,
                lambdaArn: '',
                mcpEndpoint: '',
                outboundAuth: {
                    authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH,
                    providerArn: '',
                    additionalConfig: {
                        oauthConfig: {
                            scopes: [],
                            customParameters: []
                        },
                        apiKeyConfig: {
                            location: API_KEY_LOCATION.HEADER,
                            parameterName: '',
                            prefix: ''
                        }
                    }
                }
            }
        ],
        originalTargetIds: [],
        inError: false
    };

    public toolContent: ToolHelpPanelContent = {
        title: 'MCP Server Configuration',
        content: (
            <Box variant="p">
                Configure your Model Context Protocol (MCP) server. You can either host existing MCP servers or convert
                Lambda functions/APIs into MCP servers for AI model integration.
            </Box>
        ),
        links: [
            {
                href: IG_DOCS.USE_CASES,
                text: 'Learn more about MCP servers'
            }
        ]
    };

    public contentGenerator: (props: StepContentProps) => JSX.Element = (props: StepContentProps) => {
        return <MCPServer {...props} />;
    };

    public mapStepInfoFromDeployment = (selectedDeployment: any): void => {
        // Map deployment data to step props when editing/cloning
        if (selectedDeployment?.MCPParams) {
            if (selectedDeployment.MCPParams.GatewayParams) {
                this.props.creationMethod = MCP_SERVER_CREATION_METHOD.GATEWAY;

                // Store gateway-level information for updates
                const gatewayParams = selectedDeployment.MCPParams.GatewayParams;
                this.props.gatewayInfo = {
                    gatewayId: gatewayParams.GatewayId,
                    gatewayArn: gatewayParams.GatewayArn,
                    gatewayUrl: gatewayParams.GatewayUrl,
                    gatewayName: gatewayParams.GatewayName
                };

                // Transform API response structure to UI form structure
                const apiTargets = gatewayParams.TargetParams || [];
                this.props.targets = apiTargets.map((apiTarget: any, index: number) => ({
                    // Map API field names to UI field names
                    id: apiTarget.TargetId || uuidv4(),
                    targetName: apiTarget.TargetName || '',
                    targetDescription: apiTarget.TargetDescription || '',
                    targetType: apiTarget.TargetType || GATEWAY_TARGET_TYPES.LAMBDA,

                    // Schema-related fields
                    uploadedSchema: null, // File objects can't be reconstructed from API
                    uploadedSchemaKey: apiTarget.SchemaUri || undefined,
                    uploadedSchemaFileName: apiTarget.SchemaUri
                        ? this.extractFileNameFromUri(apiTarget.SchemaUri)
                        : undefined,
                    uploadFailed: false,

                    // Lambda-specific fields
                    lambdaArn: apiTarget.LambdaArn || '',

                    // MCP Server-specific fields
                    mcpEndpoint: apiTarget.McpEndpoint || '',

                    // Outbound auth configuration
                    outboundAuth: this.mapOutboundAuthFromApi(apiTarget.OutboundAuthParams, apiTarget.TargetType)
                }));

                // Ensure we have at least one target for the UI
                if (!this.props.targets || this.props.targets.length === 0) {
                    this.props.targets = [
                        {
                            id: '1',
                            targetName: '',
                            targetDescription: '',
                            targetType: GATEWAY_TARGET_TYPES.LAMBDA,
                            uploadedSchema: null,
                            lambdaArn: '',
                            mcpEndpoint: '',
                            outboundAuth: {
                                authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH,
                                providerArn: '',
                                additionalConfig: {
                                    oauthConfig: {
                                        scopes: [],
                                        customParameters: []
                                    },
                                    apiKeyConfig: {
                                        location: API_KEY_LOCATION.HEADER,
                                        parameterName: '',
                                        prefix: ''
                                    }
                                }
                            }
                        }
                    ];
                }

                // Track original target IDs for edit mode
                this.props.originalTargetIds = apiTargets.map((apiTarget: any, index: number) =>
                    apiTarget.TargetId || `${index + 1}`
                );
            } else if (selectedDeployment.MCPParams.RuntimeParams) {
                this.props.creationMethod = MCP_SERVER_CREATION_METHOD.RUNTIME;

                // Handle ECR configuration with proper property mapping and environment variables conversion
                const runtimeParams = selectedDeployment.MCPParams.RuntimeParams;

                this.props.ecrConfig = {
                    // Map EcrUri to imageUri
                    imageUri: runtimeParams.EcrUri || '',

                    // Convert environment variables from object to array format
                    environmentVariables: runtimeParams.EnvironmentVariables
                        ? Object.entries(runtimeParams.EnvironmentVariables).map(([key, value]) => ({
                            key,
                            value: value as string
                        }))
                        : []
                };
            }
        }
    };

    /**
     * Helper method to extract filename from S3 URI or schema URI
     */
    private extractFileNameFromUri(uri: string): string {
        if (!uri) return '';

        // Handle S3 URIs and regular file paths
        const parts = uri.split('/');
        const fileName = parts[parts.length - 1];

        // Remove query parameters if present
        return fileName.split('?')[0] || 'schema-file';
    }

    /**
     * Helper method to map API outbound auth structure to UI structure
     */
    private mapOutboundAuthFromApi(apiOutboundAuth: any, targetType?: string): any {
        if (!apiOutboundAuth) {
            // For MCP Server targets, default to NO_AUTH when no auth params provided
            // For OpenAPI targets, default to OAuth
            const defaultAuthType = targetType === GATEWAY_TARGET_TYPES.MCP_SERVER
                ? GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.NO_AUTH
                : GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH;

            return {
                authType: defaultAuthType,
                providerArn: '',
                additionalConfig: {
                    oauthConfig: {
                        scopes: [],
                        customParameters: []
                    },
                    apiKeyConfig: {
                        location: API_KEY_LOCATION.HEADER,
                        parameterName: '',
                        prefix: ''
                    }
                }
            };
        }

        // Map API structure to UI structure - using correct field names from API response
        return {
            authType: apiOutboundAuth.OutboundAuthProviderType || GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH,
            providerArn: apiOutboundAuth.OutboundAuthProviderArn || '',
            additionalConfig: {
                oauthConfig: {
                    scopes: apiOutboundAuth.AdditionalConfigParams?.OAuthAdditionalConfig?.scopes || [],
                    customParameters: apiOutboundAuth.AdditionalConfigParams?.OAuthAdditionalConfig?.customParameters || []
                },
                apiKeyConfig: {
                    location: apiOutboundAuth.AdditionalConfigParams?.ApiKeyAdditionalConfig?.location || API_KEY_LOCATION.HEADER,
                    parameterName: apiOutboundAuth.AdditionalConfigParams?.ApiKeyAdditionalConfig?.parameterName || '',
                    prefix: apiOutboundAuth.AdditionalConfigParams?.ApiKeyAdditionalConfig?.prefix || ''
                }
            }
        };
    }
}
