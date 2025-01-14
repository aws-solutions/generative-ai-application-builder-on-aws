// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
