// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Input, InputProps } from '@cloudscape-design/components';

export interface InputControlProps {
    value: string;
    index: number;
    placeholder: string;
    prop: string;
    items: any[];
    setItems: React.Dispatch<any>;
    disabled?: boolean;
}

export const InputControl = React.memo(
    ({ value, index, placeholder, setItems, prop, items, disabled }: InputControlProps) => {
        const isDisabled = disabled ?? false;
        const handleValueChange = (detail: InputProps.ChangeDetail) => {
            const updatedItems = [...items];
            updatedItems[index] = {
                ...updatedItems[index],
                [prop]: detail.value
            };

            setItems(updatedItems);
        };
        return (
            <Input
                value={value}
                placeholder={placeholder}
                onChange={({ detail }) => handleValueChange(detail)}
                disabled={isDisabled}
            />
        );
    }
);

export default InputControl;
