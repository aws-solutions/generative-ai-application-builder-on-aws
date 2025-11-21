// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { FormField, RadioGroup } from '@cloudscape-design/components';
import { GATEWAY_TARGET_TYPES, MCP_TARGET_TYPE_OPTIONS } from '@/utils/constants';

interface TargetTypeSelectorProps {
    selectedType: GATEWAY_TARGET_TYPES;
    onTypeChange: (type: GATEWAY_TARGET_TYPES) => void;
    targetIndex: number;
}

export const TargetTypeSelector = ({ selectedType, onTypeChange, targetIndex }: TargetTypeSelectorProps) => {
    const targetTypeOptions = Array.from(MCP_TARGET_TYPE_OPTIONS.entries()).map(([value, config]) => ({
        value,
        label: config.label,
        description: config.description
    }));

    return (
        <FormField label="Target Type" description="Select the type of target you want to configure">
            <RadioGroup
                onChange={({ detail }) => onTypeChange(detail.value as GATEWAY_TARGET_TYPES)}
                value={selectedType}
                items={targetTypeOptions}
                data-testid={`target-type-radio-${targetIndex + 1}`}
            />
        </FormField>
    );
};

export default TargetTypeSelector;
