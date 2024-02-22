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
import { updateNumFieldsInError } from '../../utils';
import { TOOLS_CONTENT } from '../../tools-content';
import { FormField, Input, InputProps } from '@cloudscape-design/components';
import { InfoLink } from '../../../commons';

const { model: modelToolsContent } = TOOLS_CONTENT;

interface InferenceEndpointUrlInputProps extends BaseFormComponentProps {
    modelData: any;
    urlInputFormLabel?: string;
    urlInputFormDescription?: string;
    urlInputFormPlaceholder?: string;
    urlInputFormAutocomplete?: boolean;
}

export const InferenceEndpointUrlInput = (props: InferenceEndpointUrlInputProps) => {
    const [inferenceEndpointError, setInferenceEndpointError] = React.useState('');

    const onModelInferenceEndpointChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ inferenceEndpoint: detail.value });
        let errors = '';
        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }
        if (!detail.value.match('^(https://)([a-zA-Z0-9_+.-/-]{1,256})$')) {
            errors += ' Must be a valid https url';
        }
        updateNumFieldsInError(errors, inferenceEndpointError, props.setNumFieldsInError);
        setInferenceEndpointError(errors);
    };

    return (
        <FormField
            label={props.urlInputFormLabel ?? 'Inference Endpoint URL*'}
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(modelToolsContent.inferenceEndpoint)}
                    ariaLabel={'Information about inference endpoints.'}
                />
            }
            description={props.urlInputFormDescription ?? 'Enter the Inference Endpoint URL for the model.'}
            constraintText="Must be a valid https:// url to an existing Inference Endpoint."
            errorText={inferenceEndpointError}
            data-testid="model-inference-endpoint-url-field"
        >
            <Input
                placeholder={props.urlInputFormPlaceholder ?? 'https://...'}
                type={'url'}
                value={props.modelData.inferenceEndpoint}
                onChange={({ detail }) => onModelInferenceEndpointChange(detail)}
                autoComplete={props.urlInputFormAutocomplete ?? false}
                data-testid="model-inference-endpoint-url-input"
            />
        </FormField>
    );
};
