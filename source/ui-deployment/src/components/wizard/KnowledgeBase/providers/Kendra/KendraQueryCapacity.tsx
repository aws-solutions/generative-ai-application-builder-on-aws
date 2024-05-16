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
    MAX_ADDITIONAL_KENDRA_QUERY_CAPACITY,
    MIN_ADDITIONAL_KENDRA_QUERY_CAPACITY
} from '../../../../../utils/constants';
import { updateNumFieldsInError } from '../../../utils';

const { knowledgeBase: knowledgeBaseToolsContent } = TOOLS_CONTENT;

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
                    onFollow={() => props.setHelpPanelContent!(knowledgeBaseToolsContent.kendraAdditionalQueryCapacity)}
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
