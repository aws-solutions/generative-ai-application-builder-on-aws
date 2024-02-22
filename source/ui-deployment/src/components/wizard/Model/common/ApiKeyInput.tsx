/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 **********************************************************************************************************************/

import React from 'react';
import { BaseFormComponentProps } from '../../interfaces';
import { Box, Checkbox, FormField, Input, InputProps, SpaceBetween } from '@cloudscape-design/components';
import { InfoLink } from '../../../commons';
import { MAX_API_KEY_LENGTH, MIN_API_KEY_LENGTH } from '../../../../utils/constants';
import { updateNumFieldsInError } from '../../utils';
import { TOOLS_CONTENT } from '../../tools-content';

const { model: modelToolsContent } = TOOLS_CONTENT;

export interface ApiKeyInputProps extends BaseFormComponentProps {
    modelData: any;
}

export const ApiKeyInput = (props: ApiKeyInputProps) => {
    const [apiKeyError, setApiKeyError] = React.useState('');
    const [showApiKeyCheckbox, setShowApiKeyCheckbox] = React.useState(false);

    const onApiKeyChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ apiKey: detail.value });
        let errors = '';
        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }
        if (!detail.value.match(`^[a-zA-Z0-9_+:-]{${MIN_API_KEY_LENGTH},${MAX_API_KEY_LENGTH}}$`)) {
            errors +=
                'Can only include alphanumeric characters, -, _, +, and : must be between ' +
                MIN_API_KEY_LENGTH +
                ' and ' +
                MAX_API_KEY_LENGTH +
                ' characters. ';
        }
        updateNumFieldsInError(errors, apiKeyError, props.setNumFieldsInError);
        setApiKeyError(errors);
    };

    return (
        <FormField
            label="API Key*"
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(modelToolsContent.apiKey)}
                    ariaLabel={'Information about api key.'}
                />
            }
            description="API key obtained from the model provider"
            errorText={apiKeyError}
            data-testid="model-api-key-field"
        >
            <SpaceBetween size="xxs">
                <Input
                    placeholder="API Key"
                    type={showApiKeyCheckbox ? 'text' : 'password'}
                    value={props.modelData.apiKey}
                    onChange={({ detail }) => onApiKeyChange(detail)}
                    autoComplete={true}
                    data-testid="api-key-input"
                />

                <Checkbox
                    onChange={({ detail }) => setShowApiKeyCheckbox(detail.checked)}
                    checked={showApiKeyCheckbox}
                    data-testid="show-apikey-checkbox"
                >
                    <Box variant="small">Show API Key</Box>
                </Checkbox>
            </SpaceBetween>
        </FormField>
    );
};
