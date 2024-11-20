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

import { Box, FormField, RadioGroup, RadioGroupProps } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '@/components/wizard/interfaces/';
import { InfoLink } from '@/components/commons';
import { getBooleanString } from '../../utils';

interface EnableGuardrailsRadioProps extends BaseFormComponentProps {
    modelData: any;
}

export const EnableGuardrailsRadio = (props: EnableGuardrailsRadioProps) => {
    const onEnableGuardrailsChange = (detail: RadioGroupProps.ChangeDetail) => {
        const enableGuardrails = detail.value === 'Yes';
        props.onChangeFn({ 'enableGuardrails': enableGuardrails, 'guardrailIdentifier': '', 'guardrailVersion': '' });
    };

    return (
        <FormField
            label="Would you like to enable guardrails?"
            description=""
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(enableGuardrailsRadioInfoPanel)}
                    ariaLabel={'Information about enabling guardrails.'}
                />
            }
        >
            <RadioGroup
                onChange={({ detail }) => onEnableGuardrailsChange(detail)}
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
                value={getBooleanString(props.modelData.enableGuardrails)}
                data-testid="enable-guardrails-radio-group"
            />
        </FormField>
    );
};

const enableGuardrailsRadioInfoPanel = {
    title: 'Guardrails',
    content: (
        <div>
            <Box variant="p">
                Guardrails for Amazon Bedrock evaluates user inputs and Large Language Model (LLM) responses based on
                use case specific policies, and provides an additional layer of safeguards regardless of the underlying
                Foundation Model (FM). Guardrails can be applied across all LLMs on Amazon Bedrock, including fine-tuned
                models.
            </Box>
        </div>
    ),
    links: [
        {
            href: 'https://aws.amazon.com/bedrock/guardrails/',
            text: 'Guardrails for Amazon Bedrock'
        }
    ]
};

export default EnableGuardrailsRadio;
