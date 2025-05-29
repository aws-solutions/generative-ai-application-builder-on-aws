// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect } from 'react';
import { BaseFormComponentProps } from '@/components/wizard/interfaces/';
import { updateNumFieldsInError } from '@/components/wizard/utils';
import { Box, FormField, Input, InputProps } from '@cloudscape-design/components';
import { InfoLink } from '@/components/commons';

export interface BedrockModelIdInputProps extends BaseFormComponentProps {
    modelData: any;
    modelIdError?: string;
    setModelIdError?: React.Dispatch<React.SetStateAction<string>>;
    registerErrorSetter?: (setter: React.Dispatch<React.SetStateAction<string>>) => void;
}

export const BedrockModelIdInput = (props: BedrockModelIdInputProps) => {
    const [localModelIdError, setLocalModelIdError] = React.useState('');

    // Use provided error state and setter if available, otherwise use local state
    const modelIdError = props.modelIdError !== undefined ? props.modelIdError : localModelIdError;

    const setModelIdError = props.setModelIdError || setLocalModelIdError;

    // Register error setter with parent component if registerErrorSetter is provided
    useEffect(() => {
        if (props.registerErrorSetter) {
            props.registerErrorSetter(setModelIdError);
        }
    }, [props.registerErrorSetter]);

    const onModelIdChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ modelName: detail.value });
        let errors = '';
        if (detail.value.trim().length === 0) {
            errors += 'Required field. ';
        } else {
            // Validate model ID format: provider.model-name
            const modelIdPattern = /^[a-zA-Z0-9-]+\.[a-zA-Z0-9-\._]+(:[0-9]+)?$/;
            if (!modelIdPattern.test(detail.value.trim())) {
                errors +=
                    'Model ID must follow the pattern provider.model-name format (e.g., amazon.titan-text-express-v1). ';
            }
        }
        updateNumFieldsInError(errors, modelIdError, props.setNumFieldsInError);
        setModelIdError(errors);
    };

    return (
        <FormField
            label={
                <span>
                    {'Model ID'} - <i>required</i>
                </span>
            }
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(modelIdInfoPanel)}
                    ariaLabel={'Information about model ID.'}
                />
            }
            description={
                <span>
                    Enter the model ID for your Bedrock on-demand foundation model. A full list of supported models can be found in the{' '}
                    <a 
                        href="https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html" 
                        target="_blank" 
                        rel="noopener noreferrer"
                    >
                        AWS documentation
                    </a>.
                </span>
            }
            errorText={modelIdError}
            data-testid="model-id-field"
        >
            <Input
                placeholder={'Enter model ID...'}
                value={props.modelData.modelName || ''}
                onChange={({ detail }) => onModelIdChange(detail)}
                autoComplete={false}
                data-testid="model-id-input"
            />
        </FormField>
    );
};

const modelIdInfoPanel = {
    title: 'Model ID',
    content: (
        <div>
            <Box variant="p">
                Enter the model ID for your Bedrock on-demand foundation model. The model ID is a unique identifier for
                the model in Amazon Bedrock.
            </Box>
            <Box variant="p">The model ID must follow the format: [provider].[model-name], for example:</Box>
            <ul>
                <li>
                    <Box variant="p">anthropic.claude-3-sonnet-20240229-v1:0</Box>
                </li>
                <li>
                    <Box variant="p">amazon.titan-text-express-v1</Box>
                </li>
                <li>
                    <Box variant="p">meta.llama3-2-11b-instruct-v1:0</Box>
                </li>
                <li>
                    <Box variant="p">ai21.jamba-1-5-large-v1:0</Box>
                </li>
            </ul>
            <Box variant="p">
                A full list of supported on-demand foundation models can be found in the AWS documentation linked below.
            </Box>
            <Box variant="p">Length Constraints: Minimum length of 1.</Box>
            <Box variant="p">Required: Yes</Box>
        </div>
    ),
    links: [
        {
            href: 'https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html',
            text: 'Supported foundation models in Amazon Bedrock'
        }
    ]
};

export default BedrockModelIdInput;
