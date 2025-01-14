// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
