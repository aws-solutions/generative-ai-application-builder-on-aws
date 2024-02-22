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
import { Select, SelectProps } from '@cloudscape-design/components';

import { MODEL_PARAM_TYPES } from '../../../../utils/constants';

export interface SelectionControlProps {
    index: number;
    placeholder: string;
    prop: string;
    items: any[];
    setItems: React.Dispatch<any>;
}

export const SelectionControl = React.memo(({ index, placeholder, setItems, prop, items }: SelectionControlProps) => {
    const SELECTION_OPTIONS = MODEL_PARAM_TYPES.map((type) => ({ label: type, value: type }));

    const [selectOption, setSelectOption] = React.useState(items[index]?.type || '');

    const handleSelectionChange = (detail: SelectProps.ChangeDetail) => {
        setSelectOption(detail.selectedOption);

        const updatedItems = [...items];
        updatedItems[index] = {
            ...updatedItems[index],
            [prop]: detail.selectedOption
        };
        setItems(updatedItems);
    };

    return (
        <Select
            selectedAriaLabel="Selected"
            selectedOption={selectOption}
            options={SELECTION_OPTIONS}
            onChange={({ detail }) => handleSelectionChange(detail)}
            placeholder={placeholder}
        />
    );
});

export default SelectionControl;
