// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useContext } from 'react';
import { Box, Container, SpaceBetween, FormField, RadioGroup } from '@cloudscape-design/components';
import { InfoLink } from '../../commons';
import { StepContentProps } from '../interfaces/Steps';
import { MCPServerSettings } from '../interfaces/Steps/MCPServerStep';
import MCPServerConfiguration from './MCPServerConfiguration';
import {
    MCP_SERVER_CREATION_METHOD,
    GATEWAY_TARGET_TYPES,
    GATEWAY_REST_API_OUTBOUND_AUTH_TYPES,
    MCP_CREATION_METHOD_OPTIONS,
    API_KEY_LOCATION,
    DEPLOYMENT_ACTIONS,
    TARGETS_WITH_AUTH,
    TARGETS_WITH_SCHEMA
} from '@/utils/constants';
import { mcpServerInfoPanel } from './helpers';
import HomeContext from '../../../contexts/home.context';

export interface MCPServerProps extends StepContentProps {
    info: {
        mcpServer: MCPServerSettings;
    };
}

const MCPServer: React.FC<MCPServerProps> = ({ info, onChange, setHelpPanelContent }) => {
    const homeContext = useContext(HomeContext);
    const deploymentAction = homeContext?.state?.deploymentAction;
    const mcpServerInfo = info.mcpServer || {
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
        inError: false
    };

    const [numFieldsInError, setNumFieldsInError] = React.useState(0);
    const [requiredFields, setRequiredFields] = React.useState<string[]>([]);

    const isRequiredFieldsFilled = () => {
        // For gateway method, check if all targets have required fields
        if (mcpServerInfo.creationMethod === MCP_SERVER_CREATION_METHOD.GATEWAY) {
            if (!mcpServerInfo.targets || mcpServerInfo.targets.length === 0) {
                return false;
            }

            for (const target of mcpServerInfo.targets) {
                // Check target name
                if (!target.targetName || target.targetName.trim() === '') return false;

                // Check target-specific required fields
                if (
                    target.targetType === GATEWAY_TARGET_TYPES.LAMBDA &&
                    (!target.lambdaArn || target.lambdaArn.trim() === '')
                ) {
                    return false;
                }

                // Check MCP Server endpoint
                if (
                    target.targetType === GATEWAY_TARGET_TYPES.MCP_SERVER &&
                    (!target.mcpEndpoint || target.mcpEndpoint.trim() === '')
                ) {
                    return false;
                }

                // Check schema requirements - only for targets that require schema files
                if (
                    TARGETS_WITH_SCHEMA.includes(target.targetType) &&
                    !target.uploadedSchema &&
                    !target.uploadedSchemaKey
                ) {
                    return false;
                }

                // Check auth requirements for targets that support authentication
                if (
                    TARGETS_WITH_AUTH.includes(target.targetType) &&
                    target.outboundAuth &&
                    target.outboundAuth.authType !== GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.NO_AUTH
                ) {
                    if (!target.outboundAuth.providerArn || target.outboundAuth.providerArn.trim() === '') {
                        return false;
                    }
                }
            }
        }

        // For runtime method, check ECR image URI
        if (mcpServerInfo.creationMethod === MCP_SERVER_CREATION_METHOD.RUNTIME) {
            if (!mcpServerInfo.ecrConfig?.imageUri || mcpServerInfo.ecrConfig.imageUri.trim() === '') {
                return false;
            }
        }

        return true;
    };

    const updateError = () => {
        if (numFieldsInError > 0 || !isRequiredFieldsFilled()) {
            onChange({ inError: true });
        } else if (numFieldsInError === 0 && isRequiredFieldsFilled()) {
            onChange({ inError: false });
        }
    };

    React.useEffect(() => {
        updateError();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        numFieldsInError,
        requiredFields,
        mcpServerInfo.creationMethod,
        mcpServerInfo.ecrConfig?.imageUri,
        mcpServerInfo.targets
    ]);

    React.useEffect(() => {
        // Reset error state when creation method changes
        setRequiredFields([]);
        onChange({ inError: false });
    }, [mcpServerInfo.creationMethod]);

    const handleCreationMethodChange = (detail: any) => {
        setRequiredFields([]);
        onChange({
            creationMethod: detail.value as MCP_SERVER_CREATION_METHOD
        });
    };

    const isEditMode = deploymentAction === DEPLOYMENT_ACTIONS.EDIT;

    const creationMethodOptions = [
        {
            value: MCP_SERVER_CREATION_METHOD.GATEWAY,
            label: MCP_CREATION_METHOD_OPTIONS.get(MCP_SERVER_CREATION_METHOD.GATEWAY)?.label,
            description: MCP_CREATION_METHOD_OPTIONS.get(MCP_SERVER_CREATION_METHOD.GATEWAY)?.description,
            disabled: isEditMode
        },
        {
            value: MCP_SERVER_CREATION_METHOD.RUNTIME,
            label: MCP_CREATION_METHOD_OPTIONS.get(MCP_SERVER_CREATION_METHOD.RUNTIME)?.label,
            description: MCP_CREATION_METHOD_OPTIONS.get(MCP_SERVER_CREATION_METHOD.RUNTIME)?.description,
            disabled: isEditMode
        }
    ];

    return (
        <Box margin={{ bottom: 'l' }} data-testid="mcp-server-container">
            <SpaceBetween size="l">
                <Container>
                    <FormField
                        label="MCP server creation method"
                        description={
                            isEditMode
                                ? 'The creation method cannot be changed when editing an existing MCP server.'
                                : 'Choose how you want to create your MCP server or host an existing one.'
                        }
                        info={
                            <InfoLink
                                onFollow={() => setHelpPanelContent(mcpServerInfoPanel.creationMethod)}
                                ariaLabel="Information about MCP server creation methods"
                            />
                        }
                    >
                        <RadioGroup
                            value={mcpServerInfo.creationMethod}
                            items={creationMethodOptions}
                            onChange={({ detail }) => handleCreationMethodChange(detail)}
                            data-testid="mcp-creation-method-radio"
                        />
                    </FormField>
                </Container>

                {mcpServerInfo.creationMethod && (
                    <MCPServerConfiguration
                        onChangeFn={onChange}
                        setHelpPanelContent={setHelpPanelContent}
                        mcpServerData={mcpServerInfo}
                        setNumFieldsInError={setNumFieldsInError}
                        setRequiredFields={setRequiredFields}
                        deploymentAction={deploymentAction}
                        currentRegion={homeContext?.state?.runtimeConfig?.AwsRegion}
                    />
                )}
            </SpaceBetween>
        </Box>
    );
};

export default MCPServer;
