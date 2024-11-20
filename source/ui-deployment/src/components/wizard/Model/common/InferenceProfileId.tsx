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
import { BaseFormComponentProps } from '@/components/wizard/interfaces/';
import { updateNumFieldsInError } from '@/components/wizard/utils';
import { Box, FormField, Input, InputProps } from '@cloudscape-design/components';
import { InfoLink } from '@/components/commons';
import { IG_DOCS } from '@/utils/constants';

export interface InferenceProfileIdInputProps extends BaseFormComponentProps {
    modelData: any;
}

export const InferenceProfileIdInput = (props: InferenceProfileIdInputProps) => {
    const [inferenceProfileIdError, setInferenceProfileIdError] = React.useState('');

    const onInferenceProfileIdChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ inferenceProfileId: detail.value });
        let errors = '';
        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }
        if (!detail.value.match(`^[a-zA-Z0-9-:.]+$`)) {
            errors += 'Invalid inference profile ID.';
        }
        updateNumFieldsInError(errors, inferenceProfileIdError, props.setNumFieldsInError);
        setInferenceProfileIdError(errors);
    };

    return (
        <FormField
            label={
                <span>
                    {'Inference Profile ID'} - <i>required</i>
                </span>
            }
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(inferenceProfileIdInfoPanel)}
                    ariaLabel={'Information about inference profile id.'}
                />
            }
            description={'ID of the inference profile you want to use.'}
            errorText={inferenceProfileIdError}
            data-testid="inference-profile-id-field"
        >
            <Input
                placeholder={'Inference profile ID...'}
                value={props.modelData.inferenceProfileId}
                onChange={({ detail }) => onInferenceProfileIdChange(detail)}
                autoComplete={false}
                data-testid="inference-profile-id-input"
            />
        </FormField>
    );
};

const inferenceProfileIdInfoPanel = {
    title: 'Inference profile ID',
    content: (
        <div>
            <Box variant="p">The unique identifier of the inference profile.</Box>
            <div>
                <Box variant="p">
                    If you use an inference profile, specify the inference profile ID. For a list of inference profile
                    IDs, see
                    <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference-support.html">
                        Supported Regions and models for cross-region inference
                    </a>{' '}
                    in the Amazon Bedrock User Guide.
                </Box>
            </div>
            <Box variant="p">Length Constraints: Minimum length of 1. Maximum length of 64.</Box>
            <Box variant="p">
                Pattern: <code>{'^[a-zA-Z0-9-:.]+$'}</code>
            </Box>
            <Box variant="p">Required: Yes</Box>
        </div>
    ),
    links: [
        {
            href: 'https://docs.aws.amazon.com/bedrock/latest/APIReference/API_GetInferenceProfile.html#bedrock-GetInferenceProfile-response-inferenceProfileId',
            text: 'Bedrock inference profile ID'
        }
    ]
};

export default InferenceProfileIdInput;
