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
import { IG_DOCS } from '@/utils/constants';

interface ProvisionedModelRadioProps extends BaseFormComponentProps {
    modelData: any;
}

export const ProvisionedModelRadio = (props: ProvisionedModelRadioProps) => {
    const onProvisionedModelChange = (detail: RadioGroupProps.ChangeDetail) => {
        const provisionedModel = detail.value === 'Provisioned';
        props.onChangeFn({ 'provisionedModel': provisionedModel, 'modelArn': '' });
    };

    return (
        <FormField
            label="Would you like to use an on-demand model or a provisioned model?"
            description="
            Amazon Bedrock supports Provisioned Throughput to support a higher rate of inputs and outputs processed and returned by the model. Provisioned models have an unique ARN that is used to invoke the model instead of a model Id. Provisioned Throughput can be configured through the Bedrock console."
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(provisionedModelRadioInfoPanel)}
                    ariaLabel={'Information about using an on-demand vs a provisioned model.'}
                />
            }
        >
            <RadioGroup
                onChange={({ detail }) => onProvisionedModelChange(detail)}
                items={[
                    {
                        value: 'On-Demand',
                        label: 'On-Demand'
                    },
                    {
                        value: 'Provisioned',
                        label: 'Provisioned'
                    }
                ]}
                value={props.modelData.provisionedModel ? 'Provisioned' : 'On-Demand'}
                data-testid="provisioned-model-radio-group"
            />
        </FormField>
    );
};

const provisionedModelRadioInfoPanel = {
    title: 'Provisioned Throughput',
    content: (
        <div>
            <Box variant="p">
                Amazon Bedrock supports Provisioned Throughput to support a higher rate of inputs and outputs processed
                and returned by the model. Provisioned models have an unique ARN that is used to invoke the model
                instead of a model Id. Provisioned Throughput can be configured through the Bedrock console by choosing
                a base/customized model, selecting your Model Units (MUs) as units of measurements for Provisioned
                Throughput and a commitment period for the Provisioned Throughput.
            </Box>
        </div>
    ),
    links: [
        {
            href: 'https://docs.aws.amazon.com/bedrock/latest/userguide/prov-throughput.html',
            text: 'Provisioned Throughput for Amazon Bedrock'
        }
    ]
};

export default ProvisionedModelRadio;
