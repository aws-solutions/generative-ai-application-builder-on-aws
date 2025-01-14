// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
