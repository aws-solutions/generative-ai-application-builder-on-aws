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
