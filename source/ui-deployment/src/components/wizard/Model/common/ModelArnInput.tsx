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

export interface ModelArnInputProps extends BaseFormComponentProps {
    modelData: any;
    modelArnError: string;
    setModelArnError: React.Dispatch<React.SetStateAction<string>>;
}

const arnPrefix = 'arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:';
const customModelPattern = '([0-9]{12}:custom-model/[a-z0-9-]{1,63}[.]{1}[a-z0-9-:]{1,63}/[a-z0-9]{12})';
const foundationModelPattern =
    '(:foundation-model/[a-z0-9-]{1,63}[.]{1}[a-z0-9-]{1,63}([.:]?[a-z0-9-]{1,63})([.:]?[a-z0-9-]{1,63}))';
const provisionedModelPattern = '([0-9]{12}:provisioned-model/[a-z0-9]{12})';
const arnPattern = `^(${arnPrefix}(${customModelPattern}|${foundationModelPattern}|${provisionedModelPattern}))$`;

export const ModelArnInput = (props: ModelArnInputProps) => {
    const onModelArnChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ modelArn: detail.value });
        let errors = '';
        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }
        if (!detail.value.match(arnPattern)) {
            errors += 'Invalid model ARN.';
        }
        updateNumFieldsInError(errors, props.modelArnError, props.setNumFieldsInError);
        props.setModelArnError(errors);
    };

    return (
        <FormField
            label={
                <span>
                    {'Model ARN'} - <i>required</i>
                </span>
            }
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(modelArnInfoPanel)}
                    ariaLabel={"Information about model ARN's."}
                />
            }
            description={'ARN of the provisioned/custom model to use from Amazon Bedrock.'}
            errorText={props.modelArnError}
            data-testid="model-arn-field"
        >
            <Input
                placeholder={'ARN...'}
                value={props.modelData.modelArn}
                onChange={({ detail }) => onModelArnChange(detail)}
                autoComplete={false}
                data-testid="model-arn-input"
            />
        </FormField>
    );
};

const modelArnInfoPanel = {
    title: 'Model ARN',
    content: (
        <div>
            <Box variant="p">The unique identifier of the model to invoke to run inference.</Box>
            <Box variant="p">
                The <code>modelId</code> to provide depends on the type of model that you use:
            </Box>
            <div>
                <ul>
                    <li>
                        <Box variant="p">
                            If you use a provisioned model, specify the ARN of the Provisioned Throughput. For more
                            information, see{' '}
                            <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/prov-thru-use.html">
                                Run inference using a Provisioned Throughput
                            </a>{' '}
                            in the Amazon Bedrock User Guide.
                        </Box>
                    </li>
                    <li>
                        <Box variant="p">
                            If you use a custom model, first purchase Provisioned Throughput for it. Then specify the
                            ARN of the resulting provisioned model. For more information, see{' '}
                            <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-customization-use.html">
                                Use a custom model in Amazon Bedrock
                            </a>{' '}
                            in the Amazon Bedrock User Guide.
                        </Box>
                    </li>
                </ul>
            </div>
            <Box variant="p">Length Constraints: Minimum length of 1. Maximum length of 2048.</Box>
            <Box variant="p">
                Pattern:{' '}
                <code>
                    {
                        '^(arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:(([0-9]{12}:custom-model/[a-z0-9-]{1,63}[.]{1}[a-z0-9-]{1,63}/[a-z0-9]{12})|(:foundation-model/[a-z0-9-]{1,63}[.]{1}[a-z0-9-]{1,63}([.:]?[a-z0-9-]{1,63}))|([0-9]{12}:provisioned-model/[a-z0-9]{12})))|([a-z0-9-]{1,63}[.]{1}[a-z0-9-]{1,63}([.:]?[a-z0-9-]{1,63}))|(([0-9a-zA-Z][_-]?)+)$'
                    }
                </code>
            </Box>
            <Box variant="p">Required: Yes</Box>
        </div>
    ),
    links: [
        {
            href: 'https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html#API_runtime_InvokeModel_RequestSyntax',
            text: 'Bedrock InvokeModel request syntax'
        }
    ]
};

export default ModelArnInput;
