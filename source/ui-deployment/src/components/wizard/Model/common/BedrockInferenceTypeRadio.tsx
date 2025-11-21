// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, FormField, RadioGroup, RadioGroupProps } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '@/components/wizard/interfaces/';
import { InfoLink } from '@/components/commons';
import { BEDROCK_INFERENCE_TYPES } from '@/utils/constants';

interface BedrockInferenceTypeRadioProps extends BaseFormComponentProps {
    modelData: any;
    clearErrors?: () => void;
}

export const BedrockInferenceTypeRadio = (props: BedrockInferenceTypeRadioProps) => {
    const onInferenceTypeChange = (detail: RadioGroupProps.ChangeDetail) => {
        // Clear any existing errors when inference type changes
        if (props.clearErrors) {
            props.clearErrors();
        }

        // Update the inference type and clear related fields
        props.onChangeFn({
            'bedrockInferenceType': detail.value,
            'modelName': '',
            'inferenceProfileId': '',
            'modelArn': ''
        });
    };

    return (
        <FormField
            label="Inference type"
            description="Choose the inference type for your Bedrock model."
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(inferenceTypeRadioInfoPanel)}
                    ariaLabel={'Information about Bedrock inference types'}
                />
            }
        >
            <RadioGroup
                onChange={({ detail }) => onInferenceTypeChange(detail)}
                items={[
                    {
                        value: BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES,
                        label: 'Inference Profiles',
                        description:
                            "Inference profiles leverage Bedrock's cross-region inference to increase throughput and improve resiliency by routing your requests across multiple AWS Regions during peak utilization bursts."
                    },
                    {
                        value: BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS,
                        label: 'Foundation Models',
                        description:
                            'Access the full range of on-demand foundation models with different capabilities and specializations.'
                    },
                    {
                        value: BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS,
                        label: 'Provisioned Models',
                        description:
                            'Dedicated throughput capacity for production workloads requiring consistent performance.'
                    }
                ]}
                value={props.modelData.bedrockInferenceType || BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES}
                data-testid="bedrock-inference-type-radio-group"
            />
        </FormField>
    );
};

const inferenceTypeRadioInfoPanel = {
    title: 'Bedrock Inference Types',
    content: (
        <div>
            <Box variant="p">Amazon Bedrock offers different types of model access:</Box>
            <Box variant="h4">Inference Profiles</Box>
            <Box variant="p">
                Custom configurations of foundation models with specific parameter settings optimized for particular use
                cases or performance requirements.
            </Box>
            <Box variant="h4">Foundation Models</Box>
            <Box variant="p">
                Access to the full range of on-demand foundation models available in Amazon Bedrock, including models from various
                providers with different capabilities and specializations.
            </Box>
            <Box variant="h4">Provisioned Models</Box>
            <Box variant="p">
                Dedicated throughput capacity for models, providing consistent performance and lower latency.
                Provisioned models have a unique ARN and are ideal for production workloads with predictable usage
                patterns.
            </Box>
        </div>
    ),
    links: [
        {
            href: 'https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html',
            text: 'Amazon Bedrock supported models'
        },
        {
            href: 'https://docs.aws.amazon.com/bedrock/latest/userguide/prov-throughput.html',
            text: 'Provisioned Throughput for Amazon Bedrock'
        }
    ]
};

export default BedrockInferenceTypeRadio;
