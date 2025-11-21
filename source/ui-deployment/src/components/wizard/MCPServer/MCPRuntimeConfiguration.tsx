// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Container, Header, FormField, Input, InputProps, Button, SpaceBetween } from '@cloudscape-design/components';
import { InfoLink } from '../../commons';
import { BaseFormComponentProps } from '../interfaces';
import { updateNumFieldsInError } from '../utils';
import { MCPServerSettings } from '../interfaces/Steps/MCPServerStep';
import { mcpServerInfoPanel, isEcrUriValid, validateKeyValuePair, validateKey, validateValue } from './helpers';
import { MCP_RUNTIME_ENV_VARS_MAX_COUNT } from '@/utils/constants';

interface MCPRuntimeConfigurationProps extends BaseFormComponentProps {
    mcpServerData: MCPServerSettings;
    setRequiredFields: (fields: string[]) => void;
    currentRegion?: string; // Optional region for cross-region validation
}

export const MCPRuntimeConfiguration = (props: MCPRuntimeConfigurationProps) => {
    const [ecrImageUriError, setEcrImageUriError] = React.useState('');
    const [envVarKeyErrors, setEnvVarKeyErrors] = React.useState<string[]>([]);
    const [envVarValueErrors, setEnvVarValueErrors] = React.useState<string[]>([]);

    // Validate existing data when component mounts or data changes
    React.useEffect(() => {
        // Validate ECR URI
        const imageUri = props.mcpServerData.ecrConfig?.imageUri || '';
        let ecrError = '';
        if (imageUri) {
            if (!isEcrUriValid(imageUri)) {
                ecrError =
                    'Invalid ECR URI format. Expected: account-id.dkr.ecr.region.amazonaws.com/repository-name:tag ';
            } else if (props.currentRegion && !isEcrUriValid(imageUri, props.currentRegion)) {
                ecrError = `ECR image must be in the same region (${props.currentRegion}) as the deployment. `;
            }
        }
        setEcrImageUriError(ecrError);

        // Validate environment variables
        const envVars = props.mcpServerData.ecrConfig?.environmentVariables || [];
        const keyErrors: string[] = [];
        const valueErrors: string[] = [];

        envVars.forEach((envVar) => {
            const { keyError, valueError } = validateKeyValuePair(envVar, validateKey, validateValue);
            keyErrors.push(keyError);
            valueErrors.push(valueError);
        });

        setEnvVarKeyErrors(keyErrors);
        setEnvVarValueErrors(valueErrors);

        // Update error count
        if (props.setNumFieldsInError) {
            const totalErrors =
                (ecrError ? 1 : 0) + keyErrors.filter((e) => e).length + valueErrors.filter((e) => e).length;
            props.setNumFieldsInError(() => totalErrors);
        }
    }, [props.mcpServerData.ecrConfig, props.currentRegion]);

    // Helper function to filter out empty environment variables
    const filterEmptyEnvironmentVariables = (envVars: Array<{ key: string; value: string }>) => {
        return envVars.filter(
            (envVar) => (envVar.key && envVar.key.trim() !== '') || (envVar.value && envVar.value.trim() !== '')
        );
    };

    // Cleanup empty environment variables when component unmounts
    React.useEffect(() => {
        return () => {
            const currentEnvVars = props.mcpServerData.ecrConfig?.environmentVariables || [];
            const filteredEnvVars = filterEmptyEnvironmentVariables(currentEnvVars);

            if (filteredEnvVars.length !== currentEnvVars.length) {
                props.onChangeFn({
                    ecrConfig: {
                        ...props.mcpServerData.ecrConfig,
                        environmentVariables: filteredEnvVars
                    }
                });
            }
        };
    }, []);

    const onEcrImageUriChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({
            ecrConfig: {
                ...props.mcpServerData.ecrConfig,
                imageUri: detail.value
            }
        });
        let errors = '';

        if (!detail.value || detail.value.trim().length === 0) {
            errors = 'Required field. ';
        } else {
            if (!isEcrUriValid(detail.value)) {
                errors =
                    'Invalid ECR URI format. Expected: account-id.dkr.ecr.region.amazonaws.com/repository-name:tag ';
            } else if (props.currentRegion && !isEcrUriValid(detail.value, props.currentRegion)) {
                errors = `ECR image must be in the same region (${props.currentRegion}) as the deployment. `;
            }
        }

        if (props.setNumFieldsInError) {
            updateNumFieldsInError(errors, ecrImageUriError, props.setNumFieldsInError);
        }
        setEcrImageUriError(errors);
    };

    const addEnvironmentVariable = () => {
        const currentEnvVars = props.mcpServerData.ecrConfig?.environmentVariables || [];
        const newEnvVar = { key: '', value: '' };

        props.onChangeFn({
            ecrConfig: {
                ...props.mcpServerData.ecrConfig,
                environmentVariables: [...currentEnvVars, newEnvVar]
            }
        });

        // Add empty error states for the new environment variable
        setEnvVarKeyErrors([...envVarKeyErrors, '']);
        setEnvVarValueErrors([...envVarValueErrors, '']);
    };

    const removeEnvironmentVariable = (index: number) => {
        const currentEnvVars = props.mcpServerData.ecrConfig?.environmentVariables || [];
        const updatedEnvVars = currentEnvVars.filter((_, i) => i !== index);

        props.onChangeFn({
            ecrConfig: {
                ...props.mcpServerData.ecrConfig,
                environmentVariables: updatedEnvVars
            }
        });

        // Remove error states for the removed environment variable
        if (props.setNumFieldsInError) {
            const removedErrors = (envVarKeyErrors[index] ? 1 : 0) + (envVarValueErrors[index] ? 1 : 0);
            props.setNumFieldsInError((prev: number) => prev - removedErrors);
        }
        setEnvVarKeyErrors(envVarKeyErrors.filter((_, i) => i !== index));
        setEnvVarValueErrors(envVarValueErrors.filter((_, i) => i !== index));
    };

    const validateEnvironmentVariableOnBlur = (index: number) => {
        const currentEnvVars = props.mcpServerData.ecrConfig?.environmentVariables || [];
        if (!currentEnvVars[index]) return;

        const { keyError, valueError } = validateKeyValuePair(currentEnvVars[index], validateKey, validateValue);

        if (props.setNumFieldsInError) {
            const oldKeyError = envVarKeyErrors[index] || '';
            const oldValueError = envVarValueErrors[index] || '';
            const errorDelta =
                (keyError ? 1 : 0) - (oldKeyError ? 1 : 0) + (valueError ? 1 : 0) - (oldValueError ? 1 : 0);
            props.setNumFieldsInError((prev: number) => prev + errorDelta);
        }

        const newKeyErrors = [...envVarKeyErrors];
        const newValueErrors = [...envVarValueErrors];
        newKeyErrors[index] = keyError;
        newValueErrors[index] = valueError;
        setEnvVarKeyErrors(newKeyErrors);
        setEnvVarValueErrors(newValueErrors);
    };

    const updateEnvironmentVariable = (index: number, field: 'key' | 'value', newValue: string) => {
        const currentEnvVars = props.mcpServerData.ecrConfig?.environmentVariables || [];
        const updatedEnvVars = currentEnvVars.map((envVar, i) =>
            i === index ? { ...envVar, [field]: newValue } : envVar
        );

        props.onChangeFn({
            ecrConfig: {
                ...props.mcpServerData.ecrConfig,
                environmentVariables: updatedEnvVars
            }
        });
    };

    const environmentVariables = props.mcpServerData.ecrConfig?.environmentVariables || [];

    return (
        <Container
            header={<Header variant="h2">ECR Configuration</Header>}
            data-testid="mcp-runtime-configuration-container"
        >
            <SpaceBetween direction="vertical" size="l">
                <FormField
                    label={
                        <span>
                            ECR Image URI - <i>required</i>
                        </span>
                    }
                    description="The URI of the Docker image in Amazon ECR containing your MCP server."
                    errorText={ecrImageUriError}
                    data-testid="mcp-ecr-uri-field"
                    info={
                        <InfoLink
                            onFollow={() => props.setHelpPanelContent!(mcpServerInfoPanel.ecrImageUri)}
                            ariaLabel="Information about ECR Image URI"
                        />
                    }
                >
                    <Input
                        placeholder="123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest"
                        value={props.mcpServerData.ecrConfig?.imageUri || ''}
                        onChange={({ detail }) => onEcrImageUriChange(detail)}
                        autoComplete={false}
                        data-testid="mcp-ecr-uri-input"
                    />
                </FormField>

                <FormField
                    label="Environment variables"
                    description="Specify key-value pairs to configure the runtime behavior of the agent. These variables can be used to pass settings, credentials, or custom flags to the container at startup."
                    data-testid="mcp-environment-variables-field"
                >
                    <SpaceBetween direction="vertical" size="s">
                        {environmentVariables.length === 0 && (
                            <div data-testid="no-environment-variables">No environment variables</div>
                        )}

                        {environmentVariables.map((envVar, index) => (
                            <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <FormField errorText={envVarKeyErrors[index] || ''} stretch>
                                    <Input
                                        placeholder="Variable name"
                                        value={envVar.key}
                                        onChange={({ detail }) => updateEnvironmentVariable(index, 'key', detail.value)}
                                        onBlur={() => validateEnvironmentVariableOnBlur(index)}
                                        data-testid={`env-var-key-${index}`}
                                    />
                                </FormField>
                                <FormField errorText={envVarValueErrors[index] || ''} stretch>
                                    <Input
                                        placeholder="Variable value"
                                        value={envVar.value}
                                        onChange={({ detail }) =>
                                            updateEnvironmentVariable(index, 'value', detail.value)
                                        }
                                        onBlur={() => validateEnvironmentVariableOnBlur(index)}
                                        data-testid={`env-var-value-${index}`}
                                    />
                                </FormField>
                                <Button
                                    variant="link"
                                    iconName="remove"
                                    onClick={() => removeEnvironmentVariable(index)}
                                    ariaLabel={`Remove environment variable ${index + 1}`}
                                    data-testid={`remove-env-var-${index}`}
                                />
                            </div>
                        ))}

                        <div>
                            <Button
                                variant="normal"
                                iconName="add-plus"
                                onClick={addEnvironmentVariable}
                                disabled={environmentVariables.length >= MCP_RUNTIME_ENV_VARS_MAX_COUNT}
                                data-testid="add-environment-variable"
                            >
                                Add new variable
                            </Button>
                            {environmentVariables.length >= MCP_RUNTIME_ENV_VARS_MAX_COUNT && (
                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#5f6b7a' }}>
                                    You can add up to {MCP_RUNTIME_ENV_VARS_MAX_COUNT} environment variables out of{' '}
                                    {MCP_RUNTIME_ENV_VARS_MAX_COUNT}.
                                </div>
                            )}
                            {environmentVariables.length < MCP_RUNTIME_ENV_VARS_MAX_COUNT &&
                                environmentVariables.length > 0 && (
                                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#5f6b7a' }}>
                                        You can add up to {MCP_RUNTIME_ENV_VARS_MAX_COUNT - environmentVariables.length}{' '}
                                        more variables out of {MCP_RUNTIME_ENV_VARS_MAX_COUNT}.
                                    </div>
                                )}
                        </div>
                    </SpaceBetween>
                </FormField>
            </SpaceBetween>
        </Container>
    );
};

export default MCPRuntimeConfiguration;
