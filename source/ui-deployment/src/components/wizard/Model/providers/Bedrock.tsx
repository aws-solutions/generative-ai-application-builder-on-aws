// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SpaceBetween } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../interfaces';

import { ModelNameDropdown } from '../common/ModelNameDropdown';
import ProvisionedModelRadio from '../common/ProvisionedModelRadio';
import ModelArnInput from '../common/ModelArnInput';
import { INFERENCE_PROFILE } from '../../steps-config';
import InferenceProfileIdInput from '../common/InferenceProfileId';
import { useEffect, useState } from 'react';
import { updateNumFieldsInError } from '../../utils';

export interface BedrockModelProps extends BaseFormComponentProps {
    modelData: any;
}

export const BedrockModel = (props: BedrockModelProps) => {
    const [modelArnError, setModelArnError] = useState('');
    const [prevProvisionedModel, setPrevProvisionedModel] = useState<boolean>(props.modelData.provisionedModel);

    useEffect(() => {
        if (prevProvisionedModel && !props.modelData.provisionedModel) {
            // provisionedModel changed from true to false
            if (modelArnError) {
                updateNumFieldsInError('', modelArnError, props.setNumFieldsInError);
                setModelArnError('');
            }
        }
        // Update the previous value for the next render
        setPrevProvisionedModel(props.modelData.provisionedModel);
    }, [props.modelData.provisionedModel, modelArnError]);

    return (
        <SpaceBetween size="l" data-testid="bedrock-model-components">
            <ModelNameDropdown {...props} />
            {props.modelData.modelName !== '' && (
                <>
                    {props.modelData.modelName === INFERENCE_PROFILE ? (
                        <InferenceProfileIdInput
                            modelData={props.modelData}
                            onChangeFn={props.onChangeFn}
                            setHelpPanelContent={props.setHelpPanelContent}
                            setNumFieldsInError={props.setNumFieldsInError}
                        />
                    ) : (
                        <>
                            <ProvisionedModelRadio
                                modelData={props.modelData}
                                onChangeFn={props.onChangeFn}
                                setHelpPanelContent={props.setHelpPanelContent}
                                setNumFieldsInError={props.setNumFieldsInError}
                            />
                            {props.modelData.provisionedModel && (
                                <ModelArnInput
                                    modelData={props.modelData}
                                    modelArnError={modelArnError}
                                    setModelArnError={setModelArnError}
                                    onChangeFn={props.onChangeFn}
                                    setHelpPanelContent={props.setHelpPanelContent}
                                    setNumFieldsInError={props.setNumFieldsInError}
                                />
                            )}
                        </>
                    )}
                </>
            )}
        </SpaceBetween>
    );
};

export default BedrockModel;
