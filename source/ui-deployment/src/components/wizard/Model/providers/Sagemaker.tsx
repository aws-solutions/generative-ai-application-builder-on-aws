// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SpaceBetween } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../interfaces';
import SageMakerEndpointNameInput from '../common/SageMakerEndpointName';
import SagemakerPayloadSchema from '../SagemakerPayloadSchema';

export interface SagemakerModelProps extends BaseFormComponentProps {
    modelData: any;
}

export const SagemakerModel = (props: SagemakerModelProps) => {
    return (
        <SpaceBetween data-testid="sagemaker-components" size="l">
            <SageMakerEndpointNameInput {...props} />
            <SagemakerPayloadSchema {...props} />
        </SpaceBetween>
    );
};

export default SagemakerModel;
