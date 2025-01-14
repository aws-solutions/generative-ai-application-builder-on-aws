// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { FormField, RadioGroup, RadioGroupProps } from '@cloudscape-design/components';
import { InfoLink } from '@/components/commons';
import { VpcFormFieldProps, vpcToolsContent } from './helpers';
import { getBooleanString } from '../utils';

export const DeployVpc = (props: VpcFormFieldProps) => {
    const onDeployVpcChange = (detail: RadioGroupProps.ChangeDetail) => {
        const isVpcRequired = detail.value === 'Yes';

        if (!isVpcRequired) {
            props.onChangeFn({ isVpcRequired: isVpcRequired, inError: false });
        } else {
            props.onChangeFn({ isVpcRequired: isVpcRequired });
        }
    };

    return (
        <FormField
            label="Do you want to deploy this use case with a VPC?"
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(vpcToolsContent.default)}
                    ariaLabel={'Information about deploying use case in a VPC'}
                />
            }
            stretch={true}
            data-testid="deploy-in-vpc-field"
            description="Deploy the use case in a virtual private cloud (VPC)."
        >
            <RadioGroup
                onChange={({ detail }) => onDeployVpcChange(detail)}
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
                value={getBooleanString(props.vpcData.isVpcRequired)}
                data-testid="deploy-in-vpc-radio-group"
            />
        </FormField>
    );
};

export default DeployVpc;
