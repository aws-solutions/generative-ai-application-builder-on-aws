// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
