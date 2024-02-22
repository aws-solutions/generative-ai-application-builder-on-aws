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
import { MODEL_PROVIDER_NAME_MAP, WIZARD_PAGE_INDEX } from '../steps-config';
import { createBox, escapedNewLineToLineBreakTag } from '../../useCaseDetails/common-components';
import { useComponentId } from '../../commons/use-component-id';

import { ModelParams } from '../Model/AdvancedModelSettings';
import { useQueryClient } from '@tanstack/react-query';
import ReviewPrompt from './ReviewPrompt';

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
    const WIZARD_MODEL_STEP_INDEX = 1;

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

    const providersWithoutApiKeyRequirement = [MODEL_PROVIDER_NAME_MAP.Bedrock, MODEL_PROVIDER_NAME_MAP.SageMaker];
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
                                <div>
                                    <Box variant="awsui-key-label">Model temperature</Box>
                                    <div>{props.modelData.temperature}</div>
                                </div>
                                <div>
                                    <Box variant="awsui-key-label">Verbose</Box>
                                    <div>{props.modelData.verbose ? 'on' : 'off'}</div>
                                </div>
                                <div>
                                    <Box variant="awsui-key-label">Streaming</Box>
                                    <div>{props.modelData.streaming ? 'on' : 'off'}</div>
                                </div>
                                <div>
                                    <SpaceBetween size="xs">
                                        <Box variant="awsui-key-label">System prompt</Box>
                                        <ReviewPrompt
                                            promptTemplate={props.modelData.promptTemplate}
                                            modelProvider={props.modelData.modelProvider.value}
                                            modelName={props.modelData.modelName}
                                            isRagEnabled={props.knowledgeBaseData.isRagRequired}
                                        />
                                    </SpaceBetween>
                                </div>
                            </ColumnLayout>
                        </ExpandableSection>
                    }
                    data-testid="review-model-details-container"
                >
                    <ColumnLayout columns={2} variant="text-grid">
                        <div>
                            <Box variant="awsui-key-label">Model provider</Box>
                            <div>{props.modelData.modelProvider.label}</div>
                        </div>

                        {!providersWithoutApiKeyRequirement.includes(props.modelData.modelProvider.value) && (
                            <div>
                                <Box variant="awsui-key-label">API key</Box>
                                <div>{'*'.repeat(props.modelData.apiKey.length)}</div>
                            </div>
                        )}

                        {props.modelData.modelProvider.value === MODEL_PROVIDER_NAME_MAP.HFInfEndpoint && (
                            <div>
                                <Box variant="awsui-key-label">Inference Endpoint</Box>
                                <div>{props.modelData.inferenceEndpoint}</div>
                            </div>
                        )}
                        {props.modelData.modelProvider.value !== MODEL_PROVIDER_NAME_MAP.SageMaker && (
                            <div>
                                <Box variant="awsui-key-label">Model name</Box>
                                <div>{props.modelData.modelName}</div>
                            </div>
                        )}

                        {props.modelData.modelProvider.value === MODEL_PROVIDER_NAME_MAP.SageMaker && (
                            <div>
                                <Box variant="awsui-key-label">SageMaker endpoint name</Box>
                                <div>{props.modelData.sagemakerEndpointName}</div>
                            </div>
                        )}
                        {props.modelData.modelProvider.value === MODEL_PROVIDER_NAME_MAP.SageMaker && (
                            <div>
                                <Box variant="awsui-key-label">SageMaker output path schema</Box>
                                <div>{props.modelData.sagemakerOutputSchema}</div>
                            </div>
                        )}
                        {props.modelData.modelProvider.value === MODEL_PROVIDER_NAME_MAP.SageMaker && (
                            <div>
                                <Box variant="awsui-key-label">SageMaker input schema</Box>
                                <Box variant="code" data-testid="review-system-prompt">
                                    {escapedNewLineToLineBreakTag(props.modelData.sagemakerInputSchema, componentId)}
                                </Box>
                            </div>
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
