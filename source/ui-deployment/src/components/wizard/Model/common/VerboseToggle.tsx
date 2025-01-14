// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { BaseToggleComponentProps } from '../../interfaces/BaseFormComponent';
import { FormField, Toggle, ToggleProps } from '@cloudscape-design/components';

export interface VerboseToggleProps extends BaseToggleComponentProps {
    modelData: any;
}

export const VerboseToggle = (props: VerboseToggleProps) => {
    const onVerboseChange = (detail: ToggleProps.ChangeDetail) => {
        props.onChangeFn({ 'verbose': detail.checked });
    };

    return (
        <FormField
            label="Verbose"
            description="If enabled, additional logs will be written to Amazon CloudWatch."
            data-testid="model-verbose-field"
        >
            <Toggle
                onChange={({ detail }) => onVerboseChange(detail)}
                checked={props.modelData.verbose}
                data-testid="model-verbose-toggle"
            />
        </FormField>
    );
};

export default VerboseToggle;
