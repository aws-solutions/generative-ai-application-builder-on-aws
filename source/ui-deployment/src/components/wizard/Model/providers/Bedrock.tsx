// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SpaceBetween } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../interfaces';

import BedrockInferenceTypeRadio from '../common/BedrockInferenceTypeRadio';
import ModelArnInput from '../common/ModelArnInput';
import InferenceProfileIdInput from '../common/InferenceProfileId';
import { useEffect, useRef, useState } from 'react';
import { updateNumFieldsInError } from '../../utils';
import BedrockModelIdInput from '../common/BedrockModelIdInput';
import { BEDROCK_INFERENCE_TYPES } from '@/utils/constants';

export interface BedrockModelProps extends BaseFormComponentProps {
    modelData: any;
}

export const BedrockModel = (props: BedrockModelProps) => {
    // Error states
    const [modelArnError, setModelArnError] = useState('');
    const [modelIdError, setModelIdError] = useState('');
    const [inferenceProfileIdError, setInferenceProfileIdError] = useState('');

    // References to child component error setters
    const modelIdErrorSetterRef = useRef<React.Dispatch<React.SetStateAction<string>> | null>(null);
    const modelArnErrorSetterRef = useRef<React.Dispatch<React.SetStateAction<string>> | null>(null);
    const inferenceProfileIdErrorSetterRef = useRef<React.Dispatch<React.SetStateAction<string>> | null>(null);

    // Initialize inference type if not set
    useEffect(() => {
        if (!props.modelData.bedrockInferenceType) {
            props.onChangeFn({ 'bedrockInferenceType': BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES });
        }
    }, []);

    // Functions to register child component error setters
    const registerModelIdErrorSetter = (setter: React.Dispatch<React.SetStateAction<string>>) => {
        modelIdErrorSetterRef.current = setter;
    };

    const registerModelArnErrorSetter = (setter: React.Dispatch<React.SetStateAction<string>>) => {
        modelArnErrorSetterRef.current = setter;
    };

    const registerInferenceProfileIdErrorSetter = (setter: React.Dispatch<React.SetStateAction<string>>) => {
        inferenceProfileIdErrorSetterRef.current = setter;
    };

    // Comprehensive function to clear all error states, used when inference type is changed
    const clearErrors = () => {
        // Clear direct error states
        if (modelArnError) {
            updateNumFieldsInError('', modelArnError, props.setNumFieldsInError);
            setModelArnError('');
        }

        if (modelIdError) {
            updateNumFieldsInError('', modelIdError, props.setNumFieldsInError);
            setModelIdError('');
        }

        if (inferenceProfileIdError) {
            updateNumFieldsInError('', inferenceProfileIdError, props.setNumFieldsInError);
            setInferenceProfileIdError('');
        }

        // Clear errors via refs
        if (modelIdErrorSetterRef.current) {
            modelIdErrorSetterRef.current('');
        }

        if (modelArnErrorSetterRef.current) {
            modelArnErrorSetterRef.current('');
        }

        if (inferenceProfileIdErrorSetterRef.current) {
            inferenceProfileIdErrorSetterRef.current('');
        }

        // set error state count to 0
        props.setNumFieldsInError(0);
    };

    // Render the appropriate model selection component based on inferenceType
    const renderModelSelection = () => {
        switch (props.modelData.bedrockInferenceType) {
            case BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS:
                return <BedrockModelIdInput {...props} registerErrorSetter={registerModelIdErrorSetter} />;
            case BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES:
                return (
                    <InferenceProfileIdInput
                        modelData={props.modelData}
                        onChangeFn={props.onChangeFn}
                        setHelpPanelContent={props.setHelpPanelContent}
                        setNumFieldsInError={props.setNumFieldsInError}
                        registerErrorSetter={registerInferenceProfileIdErrorSetter}
                    />
                );
            case BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS:
                return (
                    <ModelArnInput
                        modelData={props.modelData}
                        onChangeFn={props.onChangeFn}
                        setHelpPanelContent={props.setHelpPanelContent}
                        setNumFieldsInError={props.setNumFieldsInError}
                        registerErrorSetter={registerModelArnErrorSetter}
                    />
                );
            default:
                return <BedrockModelIdInput {...props} registerErrorSetter={registerModelIdErrorSetter} />;
        }
    };

    return (
        <SpaceBetween size="l" data-testid="bedrock-model-components">
            <BedrockInferenceTypeRadio
                modelData={props.modelData}
                onChangeFn={props.onChangeFn}
                setHelpPanelContent={props.setHelpPanelContent}
                setNumFieldsInError={props.setNumFieldsInError}
                clearErrors={clearErrors}
            />
            {renderModelSelection()}
        </SpaceBetween>
    );
};

export default BedrockModel;
