// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { FormField, RadioGroup, RadioGroupProps } from '@cloudscape-design/components';
import { VpcFormFieldProps, vpcToolsContent } from './helpers';
import { InfoLink } from '@/components/commons';
import { getBooleanString } from '../utils';

export const UseExistingVpc = (props: VpcFormFieldProps) => {
    const onUseExistingVpcChange = (detail: RadioGroupProps.ChangeDetail) => {
        const isVpcExisting = detail.value === 'Yes';
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
                        value: 'Yes',
                        label: 'Yes'
                    },
                    {
                        value: 'No',
                        label: 'No'
                    }
                ]}
                value={getBooleanString(props.vpcData.existingVpc)}
                data-testid="use-existing-vpc-radio-group"
            />
        </FormField>
    );
};

export default UseExistingVpc;
