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

import { ColumnLayout, SpaceBetween } from '@cloudscape-design/components';
import { ModelTemperature } from './common/ModelTemperature';
import { BaseFormComponentProps, ModelProviderOption } from '../interfaces';
import VerboseToggle from './common/VerboseToggle';
import { StreamingToggle } from './common/StreamingToggle';
import EnableGuardrailsRadio from './common/EnableGuardrailsRadio';
import GuardrailIdentifierInput from './common/GuardrailIdentifierInput';
import GuardrailVersionInput from './common/GuardrailVersionInput';
import { MODEL_PROVIDER_NAME_MAP } from '../steps-config';

export interface ModelAdditionalSettingsProps extends BaseFormComponentProps {
    modelData: any;
    modelName: string;
    modelProvider: ModelProviderOption;
    isRagEnabled: boolean;
}

export const ModelAdditionalSettings = (props: ModelAdditionalSettingsProps) => {
    return (
        <SpaceBetween size="l" data-testid="model-additional-settings">
            <ModelTemperature {...props} />
            {props.modelData.modelProvider.value.toLowerCase() === MODEL_PROVIDER_NAME_MAP.Bedrock.toLowerCase() && (
                <>
                    <EnableGuardrailsRadio {...props} />
                    {props.modelData.enableGuardrails && (
                        <>
                            <GuardrailIdentifierInput {...props} />
                            <GuardrailVersionInput {...props} />
                        </>
                    )}
                </>
            )}

            <ColumnLayout columns={2} variant="text-grid">
                <VerboseToggle {...props} />
                <StreamingToggle {...props} />
            </ColumnLayout>
        </SpaceBetween>
    );
};

export default ModelAdditionalSettings;
