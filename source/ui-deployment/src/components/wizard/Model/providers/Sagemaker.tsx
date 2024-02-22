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
import InferenceEndpointNameInput from '../common/InferenceEndpointName';
import SagemakerPayloadSchema from '../SagemakerPayloadSchema';

export interface SagemakerModelProps extends BaseFormComponentProps {
    modelData: any;
}

export const SagemakerModel = (props: SagemakerModelProps) => {
    return (
        <SpaceBetween data-testid="sagemaker-components" size="l">
            <InferenceEndpointNameInput {...props} />
            <SagemakerPayloadSchema {...props} />
        </SpaceBetween>
    );
};

export default SagemakerModel;
