// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { FormField, RadioGroup } from '@cloudscape-design/components';
import { InfoLink } from '../../commons';
import { GATEWAY_TARGET_TYPES, MCP_TARGET_TYPE_OPTIONS } from '@/utils/constants';
import { mcpServerInfoPanel } from './helpers';

interface TargetTypeSelectorProps {
    selectedType: GATEWAY_TARGET_TYPES;
    onTypeChange: (type: GATEWAY_TARGET_TYPES) => void;
    targetIndex: number;
    setHelpPanelContent?: (content: any) => void;
}

export const TargetTypeSelector = ({ selectedType, onTypeChange, targetIndex, setHelpPanelContent }: TargetTypeSelectorProps) => {
    const targetTypeOptions = Array.from(MCP_TARGET_TYPE_OPTIONS.entries()).map(([value, config]) => ({
        value,
        label: config.label,
        description: config.description
    }));

    return (
        <FormField
            label="Target Type"
            description="Select the type of target you want to configure."
            info={
                setHelpPanelContent ? (
                    <InfoLink
                        onFollow={() => setHelpPanelContent(mcpServerInfoPanel.targetType)}
                        ariaLabel="Information about target types"
                    />
                ) : undefined
            }
        >
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
