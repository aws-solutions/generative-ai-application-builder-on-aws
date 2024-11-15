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

import { SpaceBetween } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../interfaces';

import { ModelNameDropdown } from '../common/ModelNameDropdown';
import ProvisionedModelRadio from '../common/ProvisionedModelRadio';
import ModelArnInput from '../common/ModelArnInput';

export interface BedrockModelProps extends BaseFormComponentProps {
    modelData: any;
}

export const BedrockModel = (props: BedrockModelProps) => {
    return (
        <SpaceBetween size="l" data-testid="bedrock-model-components">
            <ModelNameDropdown {...props} />
            {props.modelData.modelName !== '' && (
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
                            onChangeFn={props.onChangeFn}
                            setHelpPanelContent={props.setHelpPanelContent}
                            setNumFieldsInError={props.setNumFieldsInError}
                        />
                    )}
                </>
            )}
        </SpaceBetween>
    );
};

export default BedrockModel;
