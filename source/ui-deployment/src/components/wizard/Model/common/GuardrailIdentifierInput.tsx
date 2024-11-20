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

export interface GuardrailIdentifierInputProps extends BaseFormComponentProps {
    modelData: any;
}

export const GuardrailIdentifierInput = (props: GuardrailIdentifierInputProps) => {
    const [guardrailIdentifierError, setGuardrailIdentifierError] = React.useState('');

    const onGuardrailIdentifierChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ guardrailIdentifier: detail.value });
        let errors = '';
        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }
        if (
            !detail.value.match(
                `^(([a-z0-9]+)|(arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:guardrail/[a-z0-9]+))$`
            )
        ) {
            errors += 'Invalid guardrail identifier formatting.';
        }
        updateNumFieldsInError(errors, guardrailIdentifierError, props.setNumFieldsInError);
        setGuardrailIdentifierError(errors);
    };

    return (
        <FormField
            label={
                <span>
                    Guardrail Identifier - <i>required</i>
                </span>
            }
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(guardrailIdentifierInfoPanel)}
                    ariaLabel={'Information about guardrail version.'}
                />
            }
            description={
                'The unique identifier of the Bedrock guardrail that you want to be applied to all LLM invocations.'
            }
            errorText={guardrailIdentifierError}
            data-testid="guardrail-identifier-field"
        >
            <Input
                placeholder={'Guardrail identifier...'}
                value={props.modelData.guardrailIdentifier}
                onChange={({ detail }) => onGuardrailIdentifierChange(detail)}
                autoComplete={false}
                data-testid="guardrail-identifier-input"
            />
        </FormField>
    );
};

const guardrailIdentifierInfoPanel = {
    title: 'Guardrail Identifier',
    content: (
        <div>
            <Box variant="p">
                The unique identifier of the guardrail that you want to use. If you don't provide a value, no guardrail
                is applied to the invocation.
            </Box>
            <Box variant="p">An error will be thrown in the following situations.</Box>
            <div>
                <ul>
                    <li>
                        <Box variant="p">
                            You don't provide a guardrail identifier but you specify the{' '}
                            <code>amazon-bedrock-guardrailConfig</code> field in the request body.
                        </Box>
                    </li>
                    <li>
                        <Box variant="p">
                            You enable the guardrail but the <code>contentType</code> isn't{' '}
                            <code>application/json</code>.
                        </Box>
                    </li>
                    <li>
                        <Box variant="p">
                            You provide a guardrail identifier, but <code>guardrailVersion</code> isn't specified.
                        </Box>
                    </li>
                </ul>
            </div>
            <Box variant="p">Length Constraints: Minimum length of 0. Maximum length of 2048.</Box>
            <Box variant="p">
                Pattern:{' '}
                <code>
                    {'^(([a-z0-9]+)|(arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:guardrail/[a-z0-9]+))$'}
                </code>
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

export default GuardrailIdentifierInput;
