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

import { Box, ColumnLayout, SpaceBetween } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../interfaces';
import { InputSchema } from './InputSchema';
import { OutputPathSchema } from './OutputSchema';
import { RenderedInputPayload } from './RenderedInputPayload';

export interface SagemakerPayloadSchemaProps extends BaseFormComponentProps {
    modelData: any;
}

export const SagemakerPayloadSchema = (props: SagemakerPayloadSchemaProps) => {
    return (
        <Box margin={{ bottom: 'l' }} data-testid="sagemaker-payload-schema-components">
            <SpaceBetween size="l">
                <ColumnLayout columns={2} variant="text-grid">
                    <InputSchema {...props} />
                    <RenderedInputPayload {...props} />
                </ColumnLayout>
                <OutputPathSchema {...props} />
            </SpaceBetween>
        </Box>
    );
};

export default SagemakerPayloadSchema;
