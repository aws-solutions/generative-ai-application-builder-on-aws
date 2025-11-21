// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { FormField, Input, Textarea, SpaceBetween, InputProps } from '@cloudscape-design/components';
import { TargetConfiguration } from '../interfaces/Steps/MCPServerStep';
import { updateNumFieldsInError } from '../utils';
import {
    MCP_GATEWAY_TARGET_NAME_MAX_LENGTH,
    MCP_GATEWAY_TARGET_DESCRIPTION_MAX_LENGTH,
    MCP_GATEWAY_TARGET_NAME_PATTERN
} from '@/utils/constants';
import { validateOptionalStringField } from './helpers';

interface TargetBasicInfoProps {
    target: TargetConfiguration;
    targetIndex: number;
    onTargetChange: (updates: Partial<TargetConfiguration>) => void;
    nameError?: string;
    setNumFieldsInError?: (callback: (prev: number) => number) => void;
    allTargets?: TargetConfiguration[];
    isTargetNameDisabled?: boolean;
}

export const TargetBasicInfo = ({
    target,
    targetIndex,
    onTargetChange,
    nameError,
    setNumFieldsInError,
    allTargets = [],
    isTargetNameDisabled = false
}: TargetBasicInfoProps) => {
    const [currentNameError, setCurrentNameError] = React.useState(nameError || '');
    const [currentDescriptionError, setCurrentDescriptionError] = React.useState('');

    const validateTargetName = React.useCallback(
        (value: string) => {
            let errors = '';
            if (value.length === 0) {
                errors += 'Required field. ';
            } else if (value.length > MCP_GATEWAY_TARGET_NAME_MAX_LENGTH) {
                errors += `Target name exceeds maximum length of ${MCP_GATEWAY_TARGET_NAME_MAX_LENGTH} characters. Current length: ${value.length}. `;
            }

            // Check for spaces in the value
            if (!errors && value.includes(' ')) {
                errors += 'Target name cannot contain spaces. ';
            }

            const trimmedValue = value.trim();
            if (!errors && trimmedValue.length > 0) {
                if (!MCP_GATEWAY_TARGET_NAME_PATTERN.test(trimmedValue)) {
                    errors += 'Target name can only contain letters, numbers, and hyphens. ';
                }

                const isDuplicate = allTargets.some(
                    (otherTarget) =>
                        otherTarget.id !== target.id &&
                        otherTarget.targetName?.trim().toLowerCase() === trimmedValue.toLowerCase()
                );

                if (isDuplicate) {
                    errors += `A target with name '${trimmedValue}' already exists in this gateway. `;
                }
            }

            return errors;
        },
        [allTargets, target.id]
    );

    const validateTargetDescription = React.useCallback((value: string) => {
        return validateOptionalStringField(value, MCP_GATEWAY_TARGET_DESCRIPTION_MAX_LENGTH, 'Description');
    }, []);

    React.useEffect(() => {
        if (target.targetName) {
            const nameErrors = validateTargetName(target.targetName);
            if (setNumFieldsInError) {
                updateNumFieldsInError(nameErrors, currentNameError, setNumFieldsInError);
            }
            setCurrentNameError(nameErrors);
        }

        if (target.targetDescription) {
            const descriptionErrors = validateTargetDescription(target.targetDescription);
            if (setNumFieldsInError) {
                updateNumFieldsInError(descriptionErrors, currentDescriptionError, setNumFieldsInError);
            }
            setCurrentDescriptionError(descriptionErrors);
        }
    }, [
        target.targetName,
        target.targetDescription,
        validateTargetName,
        validateTargetDescription,
        setNumFieldsInError,
        currentNameError,
        currentDescriptionError
    ]);

    const onTargetNameChange = (detail: InputProps.ChangeDetail) => {
        onTargetChange({ targetName: detail.value });

        const errors = validateTargetName(detail.value);
        if (setNumFieldsInError) {
            updateNumFieldsInError(errors, currentNameError, setNumFieldsInError);
        }
        setCurrentNameError(errors);
    };

    const onTargetDescriptionChange = (detail: InputProps.ChangeDetail) => {
        onTargetChange({ targetDescription: detail.value });

        const errors = validateTargetDescription(detail.value);
        if (setNumFieldsInError) {
            updateNumFieldsInError(errors, currentDescriptionError, setNumFieldsInError);
        }
        setCurrentDescriptionError(errors);
    };

    return (
        <SpaceBetween size="l">
            <FormField
                label={
                    <span>
                        Target name - <i>required</i>
                    </span>
                }
                description="A friendly name to identify this target configuration."
                errorText={currentNameError}
                data-testid={`target-name-field-${targetIndex + 1}`}
            >
                <Input
                    placeholder="Enter target name..."
                    value={target.targetName || ''}
                    onChange={({ detail }) => onTargetNameChange(detail)}
                    autoComplete={false}
                    disabled={isTargetNameDisabled}
                    data-testid={`target-name-input-${targetIndex + 1}`}
                />
            </FormField>

            <FormField
                label="Target description"
                description="A brief description of what this target does (optional)."
                errorText={currentDescriptionError}
                data-testid={`target-description-field-${targetIndex + 1}`}
            >
                <Textarea
                    placeholder="Enter target description..."
                    value={target.targetDescription || ''}
                    onChange={({ detail }) => onTargetDescriptionChange(detail)}
                    rows={3}
                    data-testid={`target-description-textarea-${targetIndex + 1}`}
                />
            </FormField>
        </SpaceBetween>
    );
};

export default TargetBasicInfo;
