// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { FormField, Input, InputProps } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../../interfaces';
import { InfoLink } from '../../../../commons';
import {
    MAX_ADDITIONAL_KENDRA_STORAGE_CAPACITY,
    MIN_ADDITIONAL_KENDRA_STORAGE_CAPACITY
} from '../../../../../utils/constants';
import { updateNumFieldsInError } from '../../../utils';
import { knowledgeBaseInfoPanel } from '../../helpers';

interface KendraStorageCapacityProps extends BaseFormComponentProps {
    knowledgeBaseData: any;
}

export const KendraStorageCapacity = (props: KendraStorageCapacityProps) => {
    const [kendraAdditionalStorageCapacityError, setKendraAdditionalStorageCapacityError] = React.useState('');

    const onKendraAdditionalStorageCapacityChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ kendraAdditionalStorageCapacity: detail.value });
        let errors = '';
        if (!Number.isInteger(parseFloat(detail.value))) {
            errors += 'Must be a whole number. Can only include characters 0-9. ';
        } else if (
            parseFloat(detail.value) < MIN_ADDITIONAL_KENDRA_STORAGE_CAPACITY ||
            parseFloat(detail.value) > MAX_ADDITIONAL_KENDRA_STORAGE_CAPACITY
        ) {
            errors +=
                'Number must be between ' +
                MIN_ADDITIONAL_KENDRA_STORAGE_CAPACITY +
                ' and ' +
                MAX_ADDITIONAL_KENDRA_STORAGE_CAPACITY +
                '. ';
        }

        updateNumFieldsInError(errors, kendraAdditionalStorageCapacityError, props.setNumFieldsInError);
        setKendraAdditionalStorageCapacityError(errors);
    };

    return (
        <FormField
            label="Kendra additional storage capacity"
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(knowledgeBaseInfoPanel.kendraAdditionalQueryCapacity)}
                    ariaLabel={'Information about storage capacity.'}
                />
            }
            errorText={kendraAdditionalStorageCapacityError}
            data-testid="kendra-add-storage-capacity"
        >
            <Input
                onChange={({ detail }) => onKendraAdditionalStorageCapacityChange(detail)}
                placeholder="Additional storage capacity"
                value={props.knowledgeBaseData.kendraAdditionalStorageCapacity}
                type="number"
                autoComplete={false}
            />
        </FormField>
    );
};

export default KendraStorageCapacity;
