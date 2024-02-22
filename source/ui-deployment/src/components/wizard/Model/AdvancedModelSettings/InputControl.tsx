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
