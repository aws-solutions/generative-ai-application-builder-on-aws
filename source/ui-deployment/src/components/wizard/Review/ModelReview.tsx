// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    Box,
    ColumnLayout,
    Container,
    Header,
    SpaceBetween,
    Button,
    ExpandableSection,
    AttributeEditor
} from '@cloudscape-design/components';
import { ReviewSectionProps } from '../interfaces/Steps';
import { INFERENCE_PROFILE, MODEL_PROVIDER_NAME_MAP, WIZARD_PAGE_INDEX } from '../steps-config';
import { BEDROCK_INFERENCE_TYPES } from '@/utils/constants';
import { createBox, escapedNewLineToLineBreakTag, ValueWithLabel } from '@/utils';
import { useComponentId } from '../../commons/use-component-id';

import { ModelParams } from '../Model/AdvancedModelSettings';
import { useQueryClient } from '@tanstack/react-query';
import { getBooleanString } from '../utils';

interface ModelReviewProps extends ReviewSectionProps {
    knowledgeBaseData: any;
    modelData: any;
}

/**
 * Removes any empty or invalid model params that are missing values for key, value, or type
 * from modelParameters list.
 * @param {Array} modelParameters Array of items from the AttributeEditor component in
 * step 2.
 */
const sanitizeModelParams = (modelParameters: ModelParams[]) => {
    return modelParameters
        .filter((param) => Object.keys(param).length !== 0)
        .filter((param) => param.key && param.value && param.type);
};

const CreateAttributeEditor = ({
    modelParameters,
    setActiveStepIndex
}: {
    modelParameters: ModelParams[];
    setActiveStepIndex: (index: number) => void;
}) => {
    const WIZARD_MODEL_STEP_INDEX = 2;

    return (
        <AttributeEditor
            onAddButtonClick={() => setActiveStepIndex(WIZARD_MODEL_STEP_INDEX)}
            items={modelParameters}
            addButtonText="Add new item"
            definition={[
                {
                    label: 'Key',
                    control: (item) => createBox(item.key)
                },
                {
                    label: 'Value',
                    control: (item) => createBox(item.value)
                },
                {
                    label: 'Type',
                    control: (item) => createBox(item.type.value)
                }
            ]}
            isItemRemovable={() => false}
        />
    );
};

export const ModelReview = (props: ModelReviewProps) => {
    const queryClient = useQueryClient();

    props.modelData.modelParameters = sanitizeModelParams(props.modelData.modelParameters);

    const invalidateQueryAndEdit = () => {
        props.setActiveStepIndex(WIZARD_PAGE_INDEX.MODEL);
        queryClient.invalidateQueries({
            queryKey: ['modelInfo', props.modelData.modelProvider.value, props.modelData.modelName]
        });
    };

    const componentId = useComponentId();

    return (
        <SpaceBetween size="xs" className="step-3-review">
            <Header
                variant="h3"
                headingTagOverride="h2"
                actions={<Button onClick={invalidateQueryAndEdit}>Edit</Button>}
            >
                {props.header}
            </Header>
            <SpaceBetween size="l">
                <Container
                    header={
                        <Header variant="h2" headingTagOverride="h3">
                            Model selection
                        </Header>
                    }
                    footer={
                        <ExpandableSection
                            headerText="Additional settings"
                            variant="footer"
                            defaultExpanded
                            data-testid="model-review-additional-settings-expandable-section"
                        >
                            <ColumnLayout columns={2} variant="text-grid">
                                <ValueWithLabel label="Model temperature">{props.modelData.temperature}</ValueWithLabel>
                                <ValueWithLabel label="Enable guardrails">
                                    {getBooleanString(props.modelData.enableGuardrails)}
                                </ValueWithLabel>
                                {props.modelData.enableGuardrails && (
                                    <>
                                        <ValueWithLabel label="Guardrail Identifier">
                                            {props.modelData.guardrailIdentifier}
                                        </ValueWithLabel>
                                        <ValueWithLabel label="Guardrail Version">
                                            {props.modelData.guardrailVersion}
                                        </ValueWithLabel>
                                    </>
                                )}
                                <ValueWithLabel label="Verbose">
                                    {props.modelData.verbose ? 'On' : 'Off'}
                                </ValueWithLabel>
                                <ValueWithLabel label="Streaming">
                                    {props.modelData.streaming ? 'On' : 'Off'}
                                </ValueWithLabel>
                            </ColumnLayout>
                        </ExpandableSection>
                    }
                    data-testid="review-model-details-container"
                >
                    <ColumnLayout columns={2} variant="text-grid">
                        <ValueWithLabel label="Model provider">{props.modelData.modelProvider.label}</ValueWithLabel>

                        {props.modelData.modelProvider.value === MODEL_PROVIDER_NAME_MAP.Bedrock && (
                            <ValueWithLabel label="Inference type">
                                {props.modelData.bedrockInferenceType === BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS &&
                                    'Quick Start Models'}
                                {props.modelData.bedrockInferenceType ===
                                    BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS && 'Other Foundation Models'}
                                {props.modelData.bedrockInferenceType === BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES &&
                                    'Inference Profiles'}
                                {props.modelData.bedrockInferenceType === BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS &&
                                    'Provisioned Models'}
                            </ValueWithLabel>
                        )}

                        {props.modelData.modelProvider.value === MODEL_PROVIDER_NAME_MAP.Bedrock &&
                            props.modelData.bedrockInferenceType === BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS && (
                                <ValueWithLabel label="Model name">{props.modelData.modelName}</ValueWithLabel>
                            )}

                        {props.modelData.modelProvider.value === MODEL_PROVIDER_NAME_MAP.Bedrock &&
                            props.modelData.bedrockInferenceType ===
                                BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS && (
                                <ValueWithLabel label="Model ID">{props.modelData.modelName}</ValueWithLabel>
                            )}

                        {props.modelData.modelProvider.value === MODEL_PROVIDER_NAME_MAP.Bedrock &&
                            props.modelData.bedrockInferenceType === BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES && (
                                <ValueWithLabel label="Inference profile ID">
                                    {props.modelData.inferenceProfileId}
                                </ValueWithLabel>
                            )}

                        {props.modelData.modelProvider.value === MODEL_PROVIDER_NAME_MAP.Bedrock &&
                            props.modelData.bedrockInferenceType === BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS && (
                                <ValueWithLabel label="Model ARN">{props.modelData.modelArn}</ValueWithLabel>
                            )}

                        {props.modelData.modelProvider.value !== MODEL_PROVIDER_NAME_MAP.Bedrock &&
                            props.modelData.modelProvider.value !== MODEL_PROVIDER_NAME_MAP.SageMaker && (
                                <ValueWithLabel label="Model name">{props.modelData.modelName}</ValueWithLabel>
                            )}

                        {props.modelData.modelProvider.value === MODEL_PROVIDER_NAME_MAP.SageMaker && (
                            <ValueWithLabel label="SageMaker endpoint name">
                                {props.modelData.sagemakerEndpointName}
                            </ValueWithLabel>
                        )}
                        {props.modelData.modelProvider.value === MODEL_PROVIDER_NAME_MAP.SageMaker && (
                            <ValueWithLabel label="SageMaker output path schema">
                                {props.modelData.sagemakerOutputSchema}
                            </ValueWithLabel>
                        )}
                        {props.modelData.modelProvider.value === MODEL_PROVIDER_NAME_MAP.SageMaker && (
                            <ValueWithLabel label="SageMaker input schema">
                                <Box variant="code">
                                    {escapedNewLineToLineBreakTag(props.modelData.sagemakerInputSchema, componentId)}
                                </Box>
                            </ValueWithLabel>
                        )}
                    </ColumnLayout>
                </Container>
                {props.modelData.modelParameters.length > 0 && (
                    <Container
                        header={
                            <Header variant="h2" headingTagOverride="h3">
                                Advanced model parameters
                            </Header>
                        }
                    >
                        <CreateAttributeEditor
                            modelParameters={props.modelData.modelParameters}
                            setActiveStepIndex={props.setActiveStepIndex}
                        />
                    </Container>
                )}
            </SpaceBetween>
        </SpaceBetween>
    );
};

export default ModelReview;
