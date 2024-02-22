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

import { FormField, Select, SelectProps } from '@cloudscape-design/components';

interface UseCaseTypeSelectionProps {
    useCaseTypeOptions: SelectProps.Option[];
    selectedOption: SelectProps.Option;
    onChangeFn: (e: any) => void;
}

export const UseCaseTypeSelection = (props: UseCaseTypeSelectionProps) => {
    const onUseCaseChange = (detail: SelectProps.ChangeDetail) => {
        props.onChangeFn({ 'useCase': detail.selectedOption });
    };

    return (
        <FormField label={<span>Use case type</span>} data-testid="use-case-type-selection">
            <Select
                options={props.useCaseTypeOptions}
                selectedOption={props.selectedOption}
                onChange={({ detail }) => onUseCaseChange(detail)}
                selectedAriaLabel="Selected"
            />
        </FormField>
    );
};

export default UseCaseTypeSelection;
