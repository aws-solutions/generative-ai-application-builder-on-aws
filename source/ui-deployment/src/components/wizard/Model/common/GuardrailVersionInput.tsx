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

export interface GuardrailVersionInputProps extends BaseFormComponentProps {
    modelData: any;
}

export const GuardrailVersionInput = (props: GuardrailVersionInputProps) => {
    const [guardrailVersionError, setGuardrailVersionError] = React.useState('');

    const onGuardrailVersionChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ guardrailVersion: detail.value });
        let errors = '';
        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }
        if (!detail.value.match(`^(([1-9][0-9]{0,7})|(DRAFT))$`)) {
            errors += 'Invalid guardrail version formatting.';
        }
        updateNumFieldsInError(errors, guardrailVersionError, props.setNumFieldsInError);
        setGuardrailVersionError(errors);
    };

    return (
        <FormField
            label={
                <span>
                    Guardrail Version - <i>required</i>
                </span>
            }
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(guardrailVersionInfoPanel)}
                    ariaLabel={'Information about guardrail version.'}
                />
            }
            errorText={guardrailVersionError}
            data-testid="guardrail-version-field"
        >
            <Input
                placeholder={'Guardrail version...'}
                value={props.modelData.guardrailVersion}
                onChange={({ detail }) => onGuardrailVersionChange(detail)}
                autoComplete={false}
                data-testid="guardrail-version-input"
            />
        </FormField>
    );
};

const guardrailVersionInfoPanel = {
    title: 'Guardrail Version',
    content: (
        <div>
            <Box variant="p">
                The version number for the guardrail. For example, if the Guardrails version is <code>version 1</code>,
                enter <code>1</code> in this field. The value can also be <code>DRAFT</code>.
            </Box>
            <Box variant="p">
                Pattern: <code>{'^(([1-9][0-9]{0,7})|(DRAFT))$'}</code>
            </Box>
        </div>
    ),
    links: [
        {
            href: 'https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html#API_runtime_InvokeModel_RequestSyntax',
            text: 'Bedrock InvokeModel request syntax'
        }
    ]
};

export default GuardrailVersionInput;
