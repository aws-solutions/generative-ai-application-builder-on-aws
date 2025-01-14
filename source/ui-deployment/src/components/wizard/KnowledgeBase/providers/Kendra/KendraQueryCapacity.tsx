// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { FormField, Input, InputProps } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../../interfaces';
import { InfoLink } from '../../../../commons';
import {
    MAX_ADDITIONAL_KENDRA_QUERY_CAPACITY,
    MIN_ADDITIONAL_KENDRA_QUERY_CAPACITY
} from '../../../../../utils/constants';
import { updateNumFieldsInError } from '../../../utils';
import { knowledgeBaseInfoPanel } from '../../helpers';

interface KendraQueryCapacityProps extends BaseFormComponentProps {
    knowledgeBaseData: any;
}

export const KendraQueryCapacity = (props: KendraQueryCapacityProps) => {
    const [kendraAdditionalQueryCapacityError, setKendraAdditionalQueryCapacityError] = React.useState('');

    const onKendraAdditionalQueryCapacityChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ kendraAdditionalQueryCapacity: detail.value });
        let errors = '';
        if (!Number.isInteger(parseFloat(detail.value))) {
            errors += 'Must be a whole number. Can only include characters 0-9. ';
        } else if (
            parseFloat(detail.value) < MIN_ADDITIONAL_KENDRA_QUERY_CAPACITY ||
            parseFloat(detail.value) > MAX_ADDITIONAL_KENDRA_QUERY_CAPACITY
        ) {
            errors +=
                'Number must be between ' +
                MIN_ADDITIONAL_KENDRA_QUERY_CAPACITY +
                ' and ' +
                MAX_ADDITIONAL_KENDRA_QUERY_CAPACITY +
                '. ';
        }

        updateNumFieldsInError(errors, kendraAdditionalQueryCapacityError, props.setNumFieldsInError);
        setKendraAdditionalQueryCapacityError(errors);
    };

    return (
        <FormField
            label={<>Kendra additional query capacity</>}
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(knowledgeBaseInfoPanel.kendraAdditionalQueryCapacity)}
                    ariaLabel={'Information about query capacity.'}
                />
            }
            errorText={kendraAdditionalQueryCapacityError}
            data-testid="kendra-add-query-capacity"
        >
            <Input
                onChange={({ detail }) => onKendraAdditionalQueryCapacityChange(detail)}
                placeholder="Additional query capacity"
                value={props.knowledgeBaseData.kendraAdditionalQueryCapacity}
                type="number"
                autoComplete={false}
            />
        </FormField>
    );
};

export default KendraQueryCapacity;
