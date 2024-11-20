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
import { Box, FormField, Input, RadioGroup, SpaceBetween } from '@cloudscape-design/components';
import { IG_DOCS } from '@/utils/constants';
import { InfoLink } from '@/components/commons';
import { BaseFormComponentProps } from '../../interfaces';
import { getBooleanString, updateNumFieldsInError } from '../../utils';

export interface NoDocsFoundResponseProps extends BaseFormComponentProps {
    noDocsFoundResponse: string;
    'data-testid'?: string;
}

export const NoDocsFoundResponse = (props: NoDocsFoundResponseProps) => {
    const [enableNoDocsFoundResponse, setEnableNoDocsFoundResponse] = React.useState(
        props.noDocsFoundResponse ? true : false
    );
    let noDocsFoundResponseErrorText: string = validateNoDocsFoundResponse(
        enableNoDocsFoundResponse,
        props.noDocsFoundResponse
    );

    const handleNoDocFoundResponseChange = (noDocsFoundResponse: string) => {
        props.onChangeFn({ noDocsFoundResponse: noDocsFoundResponse });

        const currentError = validateNoDocsFoundResponse(enableNoDocsFoundResponse, noDocsFoundResponse);
        updateNumFieldsInError(currentError, noDocsFoundResponseErrorText, props.setNumFieldsInError);
        noDocsFoundResponseErrorText = currentError;
    };

    const handleEnableNoDocFoundResponseChange = (enabledString: string) => {
        const enabled = enabledString === 'Yes';
        setEnableNoDocsFoundResponse(enabled);

        const currentError = validateNoDocsFoundResponse(enabled, '');
        updateNumFieldsInError(currentError, noDocsFoundResponseErrorText, props.setNumFieldsInError);
        noDocsFoundResponseErrorText = currentError;

        //clear prop value if feature is disabled
        if (!enabled) {
            props.onChangeFn({ noDocsFoundResponse: undefined });
        }
    };

    return (
        <SpaceBetween size="l">
            <FormField
                label="Return static text when no documents found?"
                description="This property is only relevant when a user query results in no documents being returned. See info panel for more details."
                info={<InfoLink onFollow={() => props.setHelpPanelContent!(noDocFoundResponseInfoPanel)} />}
                data-testid={`${props['data-testid']}-radio-group-form-field`}
            >
                <RadioGroup
                    onChange={({ detail }) => handleEnableNoDocFoundResponseChange(detail.value)}
                    items={[
                        {
                            value: 'Yes',
                            label: 'Yes'
                        },
                        {
                            value: 'No',
                            label: 'No'
                        }
                    ]}
                    value={getBooleanString(enableNoDocsFoundResponse)}
                />
            </FormField>
            {enableNoDocsFoundResponse && (
                <FormField
                    label="No documents found response"
                    description="This text will be returned in place of making a call to the model when no documents are returned."
                    info={<InfoLink onFollow={() => props.setHelpPanelContent!(noDocFoundResponseInfoPanel)} />}
                    errorText={noDocsFoundResponseErrorText}
                    data-testid={`${props['data-testid']}-input-form-field`}
                >
                    <Input
                        value={props.noDocsFoundResponse}
                        onChange={({ detail }) => handleNoDocFoundResponseChange(detail.value)}
                        placeholder="Sorry, no references have been found."
                    />
                </FormField>
            )}
        </SpaceBetween>
    );
};

export default NoDocsFoundResponse;

const validateNoDocsFoundResponse = (enabled: boolean, response: string) => {
    if (!enabled) {
        return '';
    }

    if (response === undefined || response.length <= 0) {
        return 'No docs found response cannot be empty';
    }

    return '';
};

const noDocFoundResponseInfoPanel = {
    title: 'No documents found static response',
    content: (
        <div>
            <Box variant="p">
                When no documents in the knowledge base match the user's query, the static response provided here will
                be sent back.
            </Box>
            <Box variant="p">
                <i>
                    Note: If you select <b>No</b> and do not set a static response, an empty context will be forwarded
                    to the prompt template and the language model. It is recommended to experiment with different prompt
                    templates to ensure the model responds appropriately in such cases.
                </i>
            </Box>
        </div>
    ),
    links: []
};
