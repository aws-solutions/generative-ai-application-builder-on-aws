// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import {
    FormField,
    RadioGroup,
    Input,
    Header,
    ExpandableSection,
    SpaceBetween,
    InputProps
} from '@cloudscape-design/components';
import { GATEWAY_REST_API_OUTBOUND_AUTH_TYPES, MCP_AUTH_TYPE_OPTIONS } from '@/utils/constants';
import AdditionalConfigurations from './AdditionalConfigurations';
import { isValidArnWithRegexKey } from './helpers';
import { updateNumFieldsInError } from '../utils';

interface OutboundAuthConfig {
    authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES;
    providerArn?: string;
    additionalConfig?: any;
}

interface OutboundAuthProps {
    outboundAuth: OutboundAuthConfig;
    onAuthChange: (auth: Partial<OutboundAuthConfig>) => void;
    targetIndex: number;
    providerArnError?: string;
    setNumFieldsInError?: (callback: (prev: number) => number) => void;
}

export const OutboundAuth = ({
    outboundAuth,
    onAuthChange,
    targetIndex,
    providerArnError,
    setNumFieldsInError
}: OutboundAuthProps) => {
    const [currentArnError, setCurrentArnError] = React.useState(providerArnError || '');

    // Re-validate ARN when auth type changes
    React.useEffect(() => {
        if (outboundAuth.providerArn) {
            validateProviderArn(outboundAuth.providerArn);
        }
    }, [outboundAuth.authType]);

    const authTypeOptions = Array.from(MCP_AUTH_TYPE_OPTIONS.entries()).map(([value, config]) => ({
        value,
        label: config.label,
        description: config.description
    }));

    const validateProviderArn = (providerArn: string) => {
        let errors = '';
        if (providerArn.length === 0) {
            errors += 'Required field. ';
        } else {
            // Use isValidArn with bedrock-agentcore service and construct the regex key
            const regexKey = `bedrock-agentcore-identity-${outboundAuth.authType}`;
            if (!isValidArnWithRegexKey(providerArn, 'bedrock-agentcore', regexKey)) {
                if (outboundAuth.authType === GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH) {
                    errors +=
                        'Invalid OAuth provider ARN format. Expected: arn:partition:bedrock-agentcore:region:account:token-vault/vault-id/oauth2credentialprovider/name';
                } else if (outboundAuth.authType === GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.API_KEY) {
                    errors +=
                        'Invalid API Key provider ARN format. Expected: arn:partition:bedrock-agentcore:region:account:token-vault/vault-id/apikeycredentialprovider/name';
                } else {
                    errors += 'Invalid ARN format. Please enter a valid credential provider ARN.';
                }
            }
        }

        if (setNumFieldsInError) {
            updateNumFieldsInError(errors, currentArnError, setNumFieldsInError);
        }
        setCurrentArnError(errors);
    };

    const handleProviderArnChange = (detail: InputProps.ChangeDetail) => {
        const providerArn = detail.value;
        onAuthChange({ providerArn });
        validateProviderArn(providerArn);
    };

    const handleAdditionalConfigChange = (config: any) => {
        onAuthChange({
            additionalConfig: config
        });
    };

    return (
        <>
            <Header variant="h3">Outbound Authentication</Header>

            <SpaceBetween size="l">
                <FormField
                    label="Authentication Type"
                    description="Select the authentication method for outbound API calls"
                >
                    <RadioGroup
                        onChange={({ detail }) =>
                            onAuthChange({ authType: detail.value as GATEWAY_REST_API_OUTBOUND_AUTH_TYPES })
                        }
                        value={outboundAuth.authType}
                        items={authTypeOptions}
                        data-testid={`auth-type-radio-${targetIndex + 1}`}
                    />
                </FormField>

                <FormField
                    label={
                        <span>
                            Outbound Auth Provider - <i>required</i>
                        </span>
                    }
                    description="Create the outbound auth (whether API key or OAuth) in Agentcore Identity Console and provide the ARN of it in the input field below."
                    errorText={currentArnError}
                    data-testid={`provider-arn-field-${targetIndex + 1}`}
                >
                    <Input
                        value={outboundAuth.providerArn || ''}
                        onChange={({ detail }) => handleProviderArnChange(detail)}
                        placeholder={
                            outboundAuth.authType === GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH
                                ? 'arn:aws:bedrock-agentcore:region:account:token-vault/vault-id/oauth2credentialprovider/name'
                                : outboundAuth.authType === GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.API_KEY
                                  ? 'arn:aws:bedrock-agentcore:region:account:token-vault/vault-id/apikeycredentialprovider/name'
                                  : 'arn:aws:bedrock-agentcore:region:account:token-vault/vault-id/credentialprovider/name'
                        }
                        data-testid={`provider-arn-input-${targetIndex + 1}`}
                    />
                </FormField>

                <ExpandableSection
                    headerText="Additional configurations - optional"
                    data-testid={`additional-config-section-${targetIndex + 1}`}
                >
                    <AdditionalConfigurations
                        authType={outboundAuth.authType}
                        additionalConfig={outboundAuth.additionalConfig}
                        onConfigChange={handleAdditionalConfigChange}
                        targetIndex={targetIndex}
                        setNumFieldsInError={setNumFieldsInError}
                    />
                </ExpandableSection>
            </SpaceBetween>
        </>
    );
};

export default OutboundAuth;
