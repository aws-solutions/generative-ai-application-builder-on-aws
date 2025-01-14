// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Input, InputProps, FormField } from '@cloudscape-design/components';

import { updateNumFieldsInError } from '../utils';
import { VpcFormFieldProps, isVpcIdValid, vpcToolsContent } from './helpers';
import { InfoLink } from '@/components/commons';

export const VpcId = (props: VpcFormFieldProps) => {
    const [vpcIdError, setVpcIdError] = React.useState('');

    const onVpcIdChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ vpcId: detail.value });
        let errors = '';
        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }

        if (!isVpcIdValid(detail.value)) {
            errors += 'VPC ID is invalid.';
        }
        updateNumFieldsInError(errors, vpcIdError, props.setNumFieldsInError);
        setVpcIdError(errors);
    };

    React.useEffect(() => {
        onVpcIdChange({ value: props.vpcData.vpcId } as InputProps.ChangeDetail);
    }, []);

    return (
        <FormField
            label={
                <span>
                    VPC Id <i>- required</i>{' '}
                </span>
            }
            errorText={vpcIdError}
            data-testid="vpc-id-field"
            description="The Id of the VPC to be used for the use case."
            info={<InfoLink onFollow={() => props.setHelpPanelContent!(vpcToolsContent.byoVpc)} />}
        >
            <Input
                placeholder="VPC Id..."
                autoFocus
                value={props.vpcData.vpcId}
                onChange={({ detail }) => onVpcIdChange(detail)}
                disabled={props.disabled}
                autoComplete={false}
                data-testid="vpc-id-input"
            />
        </FormField>
    );
};

export default VpcId;
