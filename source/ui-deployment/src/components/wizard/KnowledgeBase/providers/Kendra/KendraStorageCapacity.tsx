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
import { FormField, Input, InputProps } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../../interfaces';
import { InfoLink } from '../../../../commons';
import { TOOLS_CONTENT } from '../../../tools-content';
import {
    MAX_ADDITIONAL_KENDRA_STORAGE_CAPACITY,
    MIN_ADDITIONAL_KENDRA_STORAGE_CAPACITY
} from '../../../../../utils/constants';
import { updateNumFieldsInError } from '../../../utils';

const { knowledgeBase: knowledgeBaseToolsContent } = TOOLS_CONTENT;

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
                    onFollow={() => props.setHelpPanelContent!(knowledgeBaseToolsContent.kendraAdditionalQueryCapacity)}
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
