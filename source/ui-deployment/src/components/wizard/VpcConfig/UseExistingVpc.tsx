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

import { FormField, RadioGroup, RadioGroupProps } from '@cloudscape-design/components';
import { VpcFormFieldProps, vpcToolsContent } from './helpers';
import { InfoLink } from 'components/commons';

export const UseExistingVpc = (props: VpcFormFieldProps) => {
    const onUseExistingVpcChange = (detail: RadioGroupProps.ChangeDetail) => {
        const isVpcExisting = detail.value === 'yes';
        if (isVpcExisting) {
            props.onChangeFn({ existingVpc: isVpcExisting });
        } else {
            props.onChangeFn({ existingVpc: isVpcExisting, inError: false });
        }
    };

    return (
        <FormField
            label="Would you like to use an existing VPC?"
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(vpcToolsContent.existingVPC)}
                    ariaLabel={
                        'You can use an existing VPC from the AWS account, or choose to deploy this Use Case in a new VPC.'
                    }
                />
            }
            stretch={true}
            data-testid="use-existing-vpc-field"
            description="You can use an existing VPC from the AWS account, or choose to deploy this Use Case in a new VPC."
        >
            <RadioGroup
                onChange={({ detail }) => onUseExistingVpcChange(detail)}
                items={[
                    {
                        value: 'yes',
                        label: 'Yes'
                    },
                    {
                        value: 'no',
                        label: 'No'
                    }
                ]}
                value={props.vpcData.existingVpc === true ? 'yes' : 'no'}
                data-testid="use-existing-vpc-radio-group"
            />
        </FormField>
    );
};

export default UseExistingVpc;
