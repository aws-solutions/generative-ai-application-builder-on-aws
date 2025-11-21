// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { InfoLink } from '../../commons/common-components';
import { Box, FormField, RadioGroup, RadioGroupProps, Alert, SpaceBetween } from '@cloudscape-design/components';
import { MultimodalSupportWarning } from '../../../utils/utils';
import { BaseToggleComponentProps } from '../interfaces/BaseFormComponent';
import { getBooleanString } from '../utils';
import {
    MULTIMODAL_MAX_IMAGES,
    MULTIMODAL_MAX_DOCUMENTS,
    MULTIMODAL_SUPPORTED_IMAGE_FORMATS,
    MULTIMODAL_SUPPORTED_DOCUMENT_FORMATS
} from '../../../utils/constants';

interface MultimodalInputSupportProps extends BaseToggleComponentProps {
    multimodalEnabled?: boolean;
}

export const MultimodalInputSupport = (props: MultimodalInputSupportProps) => {
    const onEnableMultimodalChange = (detail: RadioGroupProps.ChangeDetail) => {
        const multimodalEnabled = detail.value === 'Yes';
        props.onChangeFn({
            multimodalEnabled: multimodalEnabled
        });
    };

    //INFO PANEL CONTENT
    const enableMultimodalInfoPanel = {
        title: 'Enable multimodal input support',
        content: (
            <Box variant="p">
                If enabled, users can upload images and documents to enhance their conversations with the agent.
                Supports up to {MULTIMODAL_MAX_IMAGES} images ({MULTIMODAL_SUPPORTED_IMAGE_FORMATS.join(', ')}) and{' '}
                {MULTIMODAL_MAX_DOCUMENTS} documents ({MULTIMODAL_SUPPORTED_DOCUMENT_FORMATS.join(', ')}). Files are
                processed on-demand when relevant to user queries.
            </Box>
        )
    };

    return (
        <SpaceBetween size="l">
            <FormField
                label="Do you want to enable multimodal input support for this model?"
                info={
                    <InfoLink
                        onFollow={() => props.setHelpPanelContent!(enableMultimodalInfoPanel)}
                        ariaLabel={'Information about enabling multimodal input support for models'}
                    />
                }
                stretch={false}
                data-testid="model-multimodal-support-field"
                description="Enable file upload capabilities for images and documents as input."
            >
                <SpaceBetween size="xs">
                    <RadioGroup
                        onChange={({ detail }) => onEnableMultimodalChange(detail)}
                        items={[
                            {
                                value: 'Yes',
                                label: 'Yes'
                            },
                            {
                                value: 'No',
                                label: 'No'
                            }
                        ]}
                        value={getBooleanString(props.multimodalEnabled ?? false)}
                        data-testid="model-multimodal-radio-group"
                    />
                    {props.multimodalEnabled && (
                        <Alert type="warning" data-testid="multimodal-support-alert">
                            <MultimodalSupportWarning />
                        </Alert>
                    )}
                </SpaceBetween>
            </FormField>
        </SpaceBetween>
    );
};

export default MultimodalInputSupport;
