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

import { MODEL_PROVIDER_NAME_MAP } from '../steps-config';
import { AnthropicModel, BedrockModel, HFInferenceEndpointModel, HuggingFaceModel } from './providers';
import SagemakerModel from './providers/Sagemaker';

export interface ModelSelectionProps {
    modelData: any;
    onChange: (e: any) => void;
    setHelpPanelContent: (e: any) => void;
    setNumFieldsInError: React.Dispatch<any>;
}

export const ModelSelection = ({
    modelData,
    onChange,
    setHelpPanelContent,
    setNumFieldsInError
}: ModelSelectionProps) => {
    switch (modelData.modelProvider.value.toLowerCase()) {
        case MODEL_PROVIDER_NAME_MAP.HuggingFace.toLowerCase():
            return (
                <HuggingFaceModel
                    modelData={modelData}
                    onChangeFn={onChange}
                    setHelpPanelContent={setHelpPanelContent}
                    setNumFieldsInError={setNumFieldsInError}
                />
            );
        case MODEL_PROVIDER_NAME_MAP.HFInfEndpoint.toLowerCase():
            return (
                <HFInferenceEndpointModel
                    modelData={modelData}
                    onChangeFn={onChange}
                    setHelpPanelContent={setHelpPanelContent}
                    setNumFieldsInError={setNumFieldsInError}
                />
            );
        case MODEL_PROVIDER_NAME_MAP.Bedrock.toLowerCase():
            return (
                <BedrockModel
                    modelData={modelData}
                    onChangeFn={onChange}
                    setHelpPanelContent={setHelpPanelContent}
                    setNumFieldsInError={setNumFieldsInError}
                />
            );
        case MODEL_PROVIDER_NAME_MAP.Anthropic.toLowerCase():
            return (
                <AnthropicModel
                    modelData={modelData}
                    onChangeFn={onChange}
                    setHelpPanelContent={setHelpPanelContent}
                    setNumFieldsInError={setNumFieldsInError}
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
