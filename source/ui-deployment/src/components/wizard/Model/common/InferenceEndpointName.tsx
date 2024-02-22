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

export interface InferenceEndpointNameInputProps extends BaseFormComponentProps {
    modelData: any;
    nameInputFormLabel?: string;
    nameInputFormDescription?: string;
    nameInputFormPlaceholder?: string;
}

export const InferenceEndpointNameInput = (props: InferenceEndpointNameInputProps) => {
    const [endpointNameError, setEndpointNameError] = React.useState('');

    const onEndpointNameChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ sagemakerEndpointName: detail.value });
        let errors = '';
        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }
        if (!detail.value.match('^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}$')) {
            errors +=
                'Maximum of 63 alphanumeric characters. Can include hyphens (-), but not spaces. Cannot start with a hyphen (-).';
        }
        updateNumFieldsInError(errors, endpointNameError, props.setNumFieldsInError);
        setEndpointNameError(errors);
    };

    return (
        <FormField
            label={
                <span>
                    {props.nameInputFormLabel ?? 'Sagemaker endpoint name'} - <i>required</i>
                </span>
            }
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(modelToolsContent.sagemakerHelpPanel)}
                    ariaLabel={'Information about inference endpoints name.'}
                />
            }
            description={
                props.nameInputFormDescription ??
                'Enter the name of the SageMaker inference endpoint in this AWS account to be used.'
            }
            errorText={endpointNameError}
            data-testid="model-inference-endpoint-name-field"
            constraintText={'Note: The SageMaker endpoint name is case sensitive.'}
        >
            <Input
                placeholder={props.nameInputFormPlaceholder ?? 'endpoint name...'}
                value={props.modelData.sagemakerEndpointName}
                onChange={({ detail }) => onEndpointNameChange(detail)}
                autoComplete={false}
                data-testid="model-inference-endpoint-name-input"
            />
        </FormField>
    );
};

export default InferenceEndpointNameInput;
