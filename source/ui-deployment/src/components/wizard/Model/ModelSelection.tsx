// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MODEL_PROVIDER_NAME_MAP } from '../steps-config';
import { BedrockModel } from './providers';
import SagemakerModel from './providers/Sagemaker';

export interface ModelSelectionProps {
    modelData: any;
    onChange: (e: any) => void;
    setHelpPanelContent: (e: any) => void;
    setNumFieldsInError: React.Dispatch<any>;
    handleWizardNextStepLoading?: (isLoading: boolean) => void;
}

export const ModelSelection = ({
    modelData,
    onChange,
    setHelpPanelContent,
    setNumFieldsInError,
    handleWizardNextStepLoading
}: ModelSelectionProps) => {
    switch (modelData.modelProvider.value.toLowerCase()) {
        case MODEL_PROVIDER_NAME_MAP.Bedrock.toLowerCase():
            return (
                <BedrockModel
                    modelData={modelData}
                    onChangeFn={onChange}
                    setHelpPanelContent={setHelpPanelContent}
                    setNumFieldsInError={setNumFieldsInError}
                    handleWizardNextStepLoading={handleWizardNextStepLoading}
                />
            );
        case MODEL_PROVIDER_NAME_MAP.SageMaker.toLowerCase():
            return (
                <SagemakerModel
                    modelData={modelData}
                    onChangeFn={onChange}
                    setHelpPanelContent={setHelpPanelContent}
                    setNumFieldsInError={setNumFieldsInError}
                />
            );
        default:
            return <div>Error: Invalid model provider</div>;
    }
};
export default ModelSelection;
