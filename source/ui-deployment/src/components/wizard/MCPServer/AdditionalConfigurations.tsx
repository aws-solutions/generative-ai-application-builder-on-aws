// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { FormField, RadioGroup, Input, SpaceBetween, Button } from '@cloudscape-design/components';
import {
    OAUTH_SCOPES_MAX_COUNT,
    OAUTH_CUSTOM_PARAMS_MAX_COUNT,
    GATEWAY_REST_API_OUTBOUND_AUTH_TYPES,
    API_KEY_LOCATION,
    OAUTH_SCOPE_MAX_LENGTH,
    OAUTH_CUSTOM_PARAM_KEY_MAX_LENGTH,
    OAUTH_CUSTOM_PARAM_VALUE_MAX_LENGTH,
    API_KEY_PARAM_NAME_MAX_LENGTH,
    API_KEY_PREFIX_MAX_LENGTH
} from '@/utils/constants';
import { validateOptionalStringField, validateKeyValuePair } from './helpers';
import { updateNumFieldsInError } from '../utils';

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

interface AdditionalConfigurationsProps {
    authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES;
    additionalConfig?: AdditionalConfig;
    onConfigChange: (config: AdditionalConfig) => void;
    targetIndex: number;
    setNumFieldsInError?: (callback: (prev: number) => number) => void;
}

export const AdditionalConfigurations = ({
    authType,
    additionalConfig,
    onConfigChange,
    targetIndex,
    setNumFieldsInError
}: AdditionalConfigurationsProps) => {
    const [scopeErrors, setScopeErrors] = React.useState<string[]>([]);
    const [customParamKeyErrors, setCustomParamKeyErrors] = React.useState<string[]>([]);
    const [customParamValueErrors, setCustomParamValueErrors] = React.useState<string[]>([]);
    const [apiKeyParamNameError, setApiKeyParamNameError] = React.useState('');
    const [apiKeyPrefixError, setApiKeyPrefixError] = React.useState('');

    // Component-specific validators
    const validateOAuthScope = (scope: string): string => {
        return validateOptionalStringField(scope, OAUTH_SCOPE_MAX_LENGTH, 'Scope');
    };

    const validateOAuthCustomParamKey = (key: string): string => {
        return validateOptionalStringField(key, OAUTH_CUSTOM_PARAM_KEY_MAX_LENGTH, 'Parameter key');
    };

    const validateOAuthCustomParamValue = (value: string): string => {
        return validateOptionalStringField(value, OAUTH_CUSTOM_PARAM_VALUE_MAX_LENGTH, 'Parameter value');
    };

    const validateApiKeyParamName = (paramName: string): string => {
        return validateOptionalStringField(paramName, API_KEY_PARAM_NAME_MAX_LENGTH, 'Parameter name');
    };

    const validateApiKeyPrefix = (prefix: string): string => {
        return validateOptionalStringField(prefix, API_KEY_PREFIX_MAX_LENGTH, 'Prefix');
    };

    // Clear all errors when auth type changes
    React.useEffect(() => {
        setScopeErrors([]);
        setCustomParamKeyErrors([]);
        setCustomParamValueErrors([]);
        setApiKeyParamNameError('');
        setApiKeyPrefixError('');

        if (setNumFieldsInError) {
            setNumFieldsInError(() => 0);
        }
    }, [authType, setNumFieldsInError]);

    React.useEffect(() => {
        if (!additionalConfig) return;

        if (authType === GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH && additionalConfig.oauthConfig) {
            const currentScopes = additionalConfig.oauthConfig.scopes || [];
            const currentParams = additionalConfig.oauthConfig.customParameters || [];

            const scopeErrorsToSet = currentScopes.map((scope) =>
                scope && scope.trim() ? validateOAuthScope(scope) : ''
            );

            const paramValidationResults = currentParams.map((param) =>
                (param.key && param.key.trim()) || (param.value && param.value.trim())
                    ? validateKeyValuePair(param, validateOAuthCustomParamKey, validateOAuthCustomParamValue)
                    : { keyError: '', valueError: '' }
            );
            const keyErrorsToSet = paramValidationResults.map((result) => result.keyError);
            const valueErrorsToSet = paramValidationResults.map((result) => result.valueError);

            setScopeErrors(scopeErrorsToSet);
            setCustomParamKeyErrors(keyErrorsToSet);
            setCustomParamValueErrors(valueErrorsToSet);

            if (setNumFieldsInError) {
                const totalErrors = [scopeErrorsToSet, keyErrorsToSet, valueErrorsToSet].flat().filter(Boolean).length;
                setNumFieldsInError(() => totalErrors);
            }
        }

        if (authType === GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.API_KEY && additionalConfig.apiKeyConfig) {
            const paramName = additionalConfig.apiKeyConfig.parameterName || '';
            const prefix = additionalConfig.apiKeyConfig.prefix || '';

            const paramNameError = paramName.trim() ? validateApiKeyParamName(paramName) : '';
            const prefixError = prefix.trim() ? validateApiKeyPrefix(prefix) : '';

            setApiKeyParamNameError(paramNameError);
            setApiKeyPrefixError(prefixError);

            if (setNumFieldsInError) {
                const totalErrors = [paramNameError, prefixError].filter(Boolean).length;
                setNumFieldsInError(() => totalErrors);
            }
        }
    }, [authType, setNumFieldsInError]);

    const locationOptions = [
        { label: 'Header', value: API_KEY_LOCATION.HEADER },
        { label: 'Query parameter', value: API_KEY_LOCATION.QUERY }
    ];

    const handleConfigChange = (configType: 'oauthConfig' | 'apiKeyConfig', updates: any) => {
        const currentConfig = additionalConfig || {};
        onConfigChange({
            ...currentConfig,
            [configType]: {
                ...currentConfig[configType],
                ...updates
            }
        });
    };

    const addScope = () => {
        const currentScopes = additionalConfig?.oauthConfig?.scopes || [];
        if (currentScopes.length >= OAUTH_SCOPES_MAX_COUNT) return;

        handleConfigChange('oauthConfig', { scopes: [...currentScopes, ''] });
        setScopeErrors([...scopeErrors, '']);
    };

    const updateScope = (index: number, value: string) => {
        const currentScopes = additionalConfig?.oauthConfig?.scopes || [];
        const updatedScopes = [...currentScopes];
        updatedScopes[index] = value;
        handleConfigChange('oauthConfig', { scopes: updatedScopes });
    };

    const validateScopeOnBlur = (index: number) => {
        const currentScopes = additionalConfig?.oauthConfig?.scopes || [];
        const value = currentScopes[index] || '';

        const error = validateOAuthScope(value);
        if (setNumFieldsInError) {
            updateNumFieldsInError(error, scopeErrors[index] || '', setNumFieldsInError);
        }

        const newScopeErrors = [...scopeErrors];
        newScopeErrors[index] = error;
        setScopeErrors(newScopeErrors);
    };

    const removeScope = (index: number) => {
        const currentScopes = additionalConfig?.oauthConfig?.scopes || [];
        const updatedScopes = currentScopes.filter((_, i) => i !== index);
        handleConfigChange('oauthConfig', { scopes: updatedScopes });

        if (setNumFieldsInError && scopeErrors[index]) {
            updateNumFieldsInError('', scopeErrors[index], setNumFieldsInError);
        }

        setScopeErrors(scopeErrors.filter((_, i) => i !== index));
    };

    const addCustomParameter = () => {
        const currentParams = additionalConfig?.oauthConfig?.customParameters || [];
        if (currentParams.length >= OAUTH_CUSTOM_PARAMS_MAX_COUNT) return;

        handleConfigChange('oauthConfig', {
            customParameters: [...currentParams, { key: '', value: '' }]
        });
        setCustomParamKeyErrors([...customParamKeyErrors, '']);
        setCustomParamValueErrors([...customParamValueErrors, '']);
    };

    const updateCustomParameter = (index: number, field: 'key' | 'value', value: string) => {
        const currentParams = additionalConfig?.oauthConfig?.customParameters || [];
        const updatedParams = [...currentParams];
        updatedParams[index] = { ...updatedParams[index], [field]: value };
        handleConfigChange('oauthConfig', { customParameters: updatedParams });
    };

    const validateCustomParameterOnBlur = (index: number) => {
        const currentParams = additionalConfig?.oauthConfig?.customParameters || [];
        if (!currentParams[index]) return;

        // Validate the parameter pair
        const { keyError, valueError } = validateKeyValuePair(
            currentParams[index],
            validateOAuthCustomParamKey,
            validateOAuthCustomParamValue
        );

        if (setNumFieldsInError) {
            const oldKeyError = customParamKeyErrors[index] || '';
            const oldValueError = customParamValueErrors[index] || '';
            const errorDelta =
                (keyError ? 1 : 0) - (oldKeyError ? 1 : 0) + (valueError ? 1 : 0) - (oldValueError ? 1 : 0);
            setNumFieldsInError((prev) => prev + errorDelta);
        }

        const newKeyErrors = [...customParamKeyErrors];
        const newValueErrors = [...customParamValueErrors];
        newKeyErrors[index] = keyError;
        newValueErrors[index] = valueError;
        setCustomParamKeyErrors(newKeyErrors);
        setCustomParamValueErrors(newValueErrors);
    };

    const removeCustomParameter = (index: number) => {
        const currentParams = additionalConfig?.oauthConfig?.customParameters || [];
        const updatedParams = currentParams.filter((_, i) => i !== index);
        handleConfigChange('oauthConfig', { customParameters: updatedParams });

        if (setNumFieldsInError) {
            const removedErrors = (customParamKeyErrors[index] ? 1 : 0) + (customParamValueErrors[index] ? 1 : 0);
            setNumFieldsInError((prev) => prev - removedErrors);
        }

        setCustomParamKeyErrors(customParamKeyErrors.filter((_, i) => i !== index));
        setCustomParamValueErrors(customParamValueErrors.filter((_, i) => i !== index));
    };

    const handleApiKeyParamNameChange = (value: string) => {
        handleConfigChange('apiKeyConfig', { parameterName: value });
    };

    const handleApiKeyPrefixChange = (value: string) => {
        handleConfigChange('apiKeyConfig', { prefix: value });
    };

    const validateApiKeyParamNameOnBlur = (value: string) => {
        const error = validateApiKeyParamName(value);
        if (setNumFieldsInError) {
            updateNumFieldsInError(error, apiKeyParamNameError, setNumFieldsInError);
        }
        setApiKeyParamNameError(error);
    };

    const validateApiKeyPrefixOnBlur = (value: string) => {
        const error = validateApiKeyPrefix(value);
        if (setNumFieldsInError) {
            updateNumFieldsInError(error, apiKeyPrefixError, setNumFieldsInError);
        }
        setApiKeyPrefixError(error);
    };

    const renderOAuthConfig = () => {
        const currentScopes = additionalConfig?.oauthConfig?.scopes || [];
        const currentParams = additionalConfig?.oauthConfig?.customParameters || [];

        return (
            <SpaceBetween size="m">
                <FormField
                    label="Scopes"
                    description="Scopes are permission levels that define what an agent/tool is allowed to access or do on behalf of the user."
                >
                    <SpaceBetween size="s">
                        {currentScopes.map((scope, index) => (
                            <FormField key={index} errorText={scopeErrors[index] || ''}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <Input
                                        value={scope}
                                        onChange={({ detail }) => updateScope(index, detail.value)}
                                        onBlur={() => validateScopeOnBlur(index)}
                                        placeholder="Enter scope"
                                        data-testid={`oauth-scope-input-${targetIndex + 1}-${index}`}
                                    />
                                    <Button
                                        variant="link"
                                        iconName="remove"
                                        onClick={() => removeScope(index)}
                                        data-testid={`remove-scope-${targetIndex + 1}-${index}`}
                                    />
                                </div>
                            </FormField>
                        ))}
                        <Button
                            variant="link"
                            iconName="add-plus"
                            onClick={addScope}
                            disabled={currentScopes.length >= OAUTH_SCOPES_MAX_COUNT}
                            data-testid={`add-scope-${targetIndex + 1}`}
                        >
                            Add scope{' '}
                            {currentScopes.length >= OAUTH_SCOPES_MAX_COUNT &&
                                `(Maximum of ${OAUTH_SCOPES_MAX_COUNT} scopes reached)`}
                        </Button>
                        {currentScopes.length === 0 && (
                            <div style={{ color: '#5f6b7a', fontSize: '14px' }}>
                                No scopes configured with this resource.
                            </div>
                        )}
                    </SpaceBetween>
                </FormField>

                <FormField
                    label="Custom parameters"
                    description="Custom parameters are specific configurations as part of your identity provider."
                >
                    <SpaceBetween size="s">
                        {currentParams.map((param, index) => (
                            <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <FormField errorText={customParamKeyErrors[index] || ''} stretch>
                                    <Input
                                        value={param.key}
                                        onChange={({ detail }) => updateCustomParameter(index, 'key', detail.value)}
                                        onBlur={() => validateCustomParameterOnBlur(index)}
                                        placeholder="Enter parameter name"
                                        data-testid={`oauth-param-key-${targetIndex + 1}-${index}`}
                                    />
                                </FormField>
                                <FormField errorText={customParamValueErrors[index] || ''} stretch>
                                    <Input
                                        value={param.value}
                                        onChange={({ detail }) => updateCustomParameter(index, 'value', detail.value)}
                                        onBlur={() => validateCustomParameterOnBlur(index)}
                                        placeholder="Enter parameter value"
                                        data-testid={`oauth-param-value-${targetIndex + 1}-${index}`}
                                    />
                                </FormField>
                                <Button
                                    variant="link"
                                    iconName="remove"
                                    onClick={() => removeCustomParameter(index)}
                                    data-testid={`remove-param-${targetIndex + 1}-${index}`}
                                />
                            </div>
                        ))}
                        <Button
                            variant="link"
                            iconName="add-plus"
                            onClick={addCustomParameter}
                            disabled={currentParams.length >= OAUTH_CUSTOM_PARAMS_MAX_COUNT}
                            data-testid={`add-custom-param-${targetIndex + 1}`}
                        >
                            Add custom parameter{' '}
                            {currentParams.length >= OAUTH_CUSTOM_PARAMS_MAX_COUNT &&
                                `(Maximum of ${OAUTH_CUSTOM_PARAMS_MAX_COUNT} parameters reached)`}
                        </Button>
                        {currentParams.length === 0 && (
                            <div style={{ color: '#5f6b7a', fontSize: '14px' }}>
                                No custom parameters configured with this resource.
                            </div>
                        )}
                    </SpaceBetween>
                </FormField>
            </SpaceBetween>
        );
    };

    const renderApiKeyConfig = () => (
        <SpaceBetween size="m">
            <FormField label="Location" description="Specify the location of the API key.">
                <RadioGroup
                    onChange={({ detail }) => handleConfigChange('apiKeyConfig', { location: detail.value })}
                    value={additionalConfig?.apiKeyConfig?.location || API_KEY_LOCATION.HEADER}
                    items={locationOptions}
                    data-testid={`api-key-location-radio-${targetIndex + 1}`}
                />
            </FormField>

            <FormField
                label="Parameter name"
                description="Specify the name of the parameter that will contain the API key value."
                errorText={apiKeyParamNameError}
            >
                <Input
                    value={additionalConfig?.apiKeyConfig?.parameterName || ''}
                    onChange={({ detail }) => handleApiKeyParamNameChange(detail.value)}
                    onBlur={() => validateApiKeyParamNameOnBlur(additionalConfig?.apiKeyConfig?.parameterName || '')}
                    placeholder="Enter parameter name"
                    data-testid={`api-key-param-name-${targetIndex + 1}`}
                />
            </FormField>

            <FormField
                label="Prefix"
                description="Optional prefix to add before the API key value (e.g., 'Bearer' for Authorization header)."
                errorText={apiKeyPrefixError}
            >
                <Input
                    value={additionalConfig?.apiKeyConfig?.prefix || ''}
                    onChange={({ detail }) => handleApiKeyPrefixChange(detail.value)}
                    onBlur={() => validateApiKeyPrefixOnBlur(additionalConfig?.apiKeyConfig?.prefix || '')}
                    placeholder="E.g. Bearer"
                    data-testid={`api-key-prefix-${targetIndex + 1}`}
                />
            </FormField>
        </SpaceBetween>
    );

    return (
        <>
            {authType === GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH && renderOAuthConfig()}
            {authType === GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.API_KEY && renderApiKeyConfig()}
        </>
    );
};

export default AdditionalConfigurations;
