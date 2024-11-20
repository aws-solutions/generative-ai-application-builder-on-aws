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
import { Box, FormField, Input, InputProps, SpaceBetween } from '@cloudscape-design/components';
import { InfoLink } from '../../../commons';
import { IG_DOCS } from '@/utils/constants';

export interface SageMakerEndpointNameInputProps extends BaseFormComponentProps {
    modelData: any;
    nameInputFormLabel?: string;
    nameInputFormDescription?: string;
    nameInputFormPlaceholder?: string;
}

export const SageMakerEndpointNameInput = (props: SageMakerEndpointNameInputProps) => {
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
                    {props.nameInputFormLabel ?? 'SageMaker endpoint name'} - <i>required</i>
                </span>
            }
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(endpointNameInfoPanel)}
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

export default SageMakerEndpointNameInput;

//INFO PANEL CONTENT
const endpointNameInfoPanel = {
    title: 'Using SageMaker Endpoint',
    content: (
        <SpaceBetween size="xs">
            <Box variant="p">
                SageMaker is available as a Model Provider for Text use cases. This feature allows you to use a
                SageMaker Inference Endpoint already existing within the AWS account in the solution.
            </Box>

            <Box variant="h4">SageMaker Endpoint Name</Box>
            <Box variant="p">
                The name of the SageMaker Endpoint you wish to use. DevOps users can obtain this from the AWS console.
                Note that the endpoint must be in the same account and region as the solution is deployed in.
            </Box>

            <Box variant="h4">Note</Box>
            <Box variant="p">
                SageMaker now supports hosting multiple models behind the same endpoint, and this is the default
                configuration when deploying an endpoint in the current version of SageMaker Studio (i.e. not Studio
                Classic). If your endpoint is configured in this way, you will be required to add
                “InferenceComponentName” to the advanced model parameters section, with a value corresponding to the
                name of the model you wish to use.
            </Box>
        </SpaceBetween>
    ),
    links: [
        {
            href: IG_DOCS.SAGEMAKER_CREATE_ENDPOINT,
            text: 'Creating a SageMaker Endpoint'
        },
        {
            href: IG_DOCS.SAGEMAKER_USE,
            text: 'Using a SageMaker Endpoint'
        }
    ]
};
