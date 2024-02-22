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

import ThirdPartyLegalDisclaimer from '../common/ThirdPartyLegalDisclaimer';
import { ModelNameDropdown } from '../common/ModelNameDropdown';
import { ApiKeyInput } from '../common/ApiKeyInput';

export interface HuggingFaceModelProps extends BaseFormComponentProps {
    modelData: any;
}

export const HuggingFaceModel = (props: HuggingFaceModelProps) => {
    return (
        <SpaceBetween size="l" data-testid="huggingface-model-components">
            <ThirdPartyLegalDisclaimer />
            <ModelNameDropdown {...props} />
            <ApiKeyInput {...props} />
        </SpaceBetween>
    );
};

export default HuggingFaceModel;
