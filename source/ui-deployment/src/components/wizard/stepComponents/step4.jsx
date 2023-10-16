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
 *********************************************************************************************************************/

import {
    AttributeEditor,
    Box,
    Button,
    ColumnLayout,
    Container,
    ExpandableSection,
    Header,
    SpaceBetween
} from '@cloudscape-design/components';
import { useContext } from 'react';
import { HF_INF_ENDPOINT_OPTION_IDX, MODEL_FAMILY_PROVIDER_OPTIONS, BEDROCK_MODEL_OPTION_IDX } from '../steps-config';
import {
    createBox,
    escapedNewLineToLineBreakTag,
    getSystemPromptFromRuntimeConfig
} from '../../useCaseDetails/common-components';
import HomeContext from '../../../home/home.context';
import { useComponentId } from '../../commons/use-component-id';

const WIZARD_MODEL_STEP_INDEX = 1;

/**
 * Removes any empty or invalid model params that are missing values for key, value, or type
 * from modelParameters list.
 * @param {Array} modelParameters Array of items from the AttributeEditor component in
 * step 2.
 */
const sanitizeModelParams = (modelParameters) => {
    return modelParameters
        .filter((param) => Object.keys(param).length !== 0)
        .filter((param) => param.key && param.value && param.type);
};

const CreateAttributeEditor = ({ modelParameters, setActiveStepIndex }) => {
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

const selectSystemPrompt = (formInputSystemPrompt, runtimeConfig, modelProvider, isRagEnabled, modelName) => {
    if (formInputSystemPrompt === undefined || formInputSystemPrompt === '') {
        return getSystemPromptFromRuntimeConfig(
            runtimeConfig,
            modelProvider,
            isRagEnabled,
            modelProvider === MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX].value
                ? modelName.substring(0, modelName.indexOf('.'))
                : undefined
        );
    }
    return formInputSystemPrompt;
};

const Review = ({ info: { useCase, knowledgeBase, model }, setActiveStepIndex }) => {
    const {
        state: { runtimeConfig }
    } = useContext(HomeContext);

    model.modelParameters = sanitizeModelParams(model.modelParameters);
    return (
        <Box margin={{ bottom: 'l' }} data-testid="review-deployment-component">
            <SpaceBetween size="xxl">
                <SpaceBetween size="xs" className="step-1-review">
                    <Header
                        variant="h3"
                        headingTagOverride="h2"
                        actions={
                            <Button className="edit-step-btn" onClick={() => setActiveStepIndex(0)}>
                                Edit
                            </Button>
                        }
                    >
                        Step 1: Use case
                    </Header>
                    <Container
                        header={
                            <Header variant="h2" headingTagOverride="h3">
                                Use case options
                            </Header>
                        }
                    >
                        <ColumnLayout columns={2} variant="text-grid" data-testid="review-use-case-details">
                            <div>
                                <Box variant="awsui-key-label">Use case</Box>
                                <div>{useCase.useCase.label}</div>
                            </div>

                            <div>
                                <Box variant="awsui-key-label">Use case name</Box>
                                <div>{useCase.useCaseName}</div>
                            </div>

                            <div>
                                <Box variant="awsui-key-label">Use case email</Box>
                                <div>{useCase.defaultUserEmail}</div>
                            </div>

                            <div>
                                <Box variant="awsui-key-label">Use case description</Box>
                                <div>{useCase.useCaseDescription}</div>
                            </div>
                        </ColumnLayout>
                    </Container>
                </SpaceBetween>

                <SpaceBetween size="xs" className="step-3-review">
                    <Header
                        variant="h3"
                        headingTagOverride="h2"
                        actions={
                            <Button className="edit-step-btn" onClick={() => setActiveStepIndex(1)}>
                                Edit
                            </Button>
                        }
                    >
                        Step 2: Model
                    </Header>
                    <SpaceBetween size="l">
                        <Container
                            header={
                                <Header variant="h2" headingTagOverride="h3">
                                    Model selection
                                </Header>
                            }
                            footer={
                                <ExpandableSection headerText="Additional settings" variant="footer" defaultExpanded>
                                    <ColumnLayout columns={2} variant="text-grid">
                                        <div>
                                            <Box variant="awsui-key-label">Model temperature</Box>
                                            <div>{model.temperature}</div>
                                        </div>
                                        <div>
                                            <Box variant="awsui-key-label">Verbose</Box>
                                            <div>{model.verbose ? 'on' : 'off'}</div>
                                        </div>
                                        <div>
                                            <Box variant="awsui-key-label">Streaming</Box>
                                            <div>{model.streaming ? 'on' : 'off'}</div>
                                        </div>
                                        <div>
                                            <Box variant="awsui-key-label">System prompt</Box>
                                            <Box variant="code" data-testid="review-system-prompt">
                                                {escapedNewLineToLineBreakTag(
                                                    selectSystemPrompt(
                                                        model.promptTemplate,
                                                        runtimeConfig,
                                                        model.modelProvider.value,
                                                        knowledgeBase.isRagRequired,
                                                        model.modelName
                                                    ),
                                                    useComponentId()
                                                )}
                                            </Box>
                                        </div>
                                    </ColumnLayout>
                                </ExpandableSection>
                            }
                        >
                            <ColumnLayout columns={2} variant="text-grid">
                                <div>
                                    <Box variant="awsui-key-label">Model provider</Box>
                                    <div>{model.modelProvider.label}</div>
                                </div>

                                {model.modelProvider !== MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX] && (
                                    <div>
                                        <Box variant="awsui-key-label">API key</Box>
                                        <div>{'*'.repeat(model.apiKey.length)}</div>
                                    </div>
                                )}

                                {model.modelProvider === MODEL_FAMILY_PROVIDER_OPTIONS[HF_INF_ENDPOINT_OPTION_IDX] && (
                                    <div>
                                        <Box variant="awsui-key-label">Inference Endpoint</Box>
                                        <div>{model.inferenceEndpoint}</div>
                                    </div>
                                )}
                                <div>
                                    <Box variant="awsui-key-label">Model name</Box>
                                    <div>{model.modelName}</div>
                                </div>
                            </ColumnLayout>
                        </Container>
                        {model.modelParameters.length > 0 && (
                            <Container
                                header={
                                    <Header variant="h2" headingTagOverride="h3">
                                        Advanced model parameters
                                    </Header>
                                }
                            >
                                <CreateAttributeEditor
                                    modelParameters={model.modelParameters}
                                    setActiveStepIndex={setActiveStepIndex}
                                />
                            </Container>
                        )}
                    </SpaceBetween>
                </SpaceBetween>

                <SpaceBetween size="xs" className="step-2-review">
                    <Header
                        variant="h3"
                        headingTagOverride="h2"
                        actions={
                            <Button className="edit-step-btn" onClick={() => setActiveStepIndex(2)}>
                                Edit
                            </Button>
                        }
                    >
                        Step 3: Knowledge base
                    </Header>

                    <SpaceBetween size="l">
                        <Container
                            header={
                                <Header variant="h2" headingTagOverride="h3">
                                    Retrieval Augmented Generation (RAG)
                                </Header>
                            }
                        >
                            <ColumnLayout columns={1} variant="text-grid">
                                <div>
                                    <Box variant="awsui-key-label">
                                        Do you want to enable Retrieval Augmented Generation (RAG) for this use case?
                                    </Box>
                                    <div>{knowledgeBase.isRagRequired ? 'Yes' : 'No'}</div>
                                </div>
                            </ColumnLayout>
                        </Container>
                        {knowledgeBase.isRagRequired && (
                            <Container
                                header={
                                    <Header variant="h2" headingTagOverride="h3">
                                        Knowledge base options
                                    </Header>
                                }
                                footer={
                                    <Box>
                                        {knowledgeBase.existingKendraIndex === 'no' && (
                                            <ExpandableSection headerText="Additional options" variant="footer">
                                                <ColumnLayout columns={2} variant="text-grid">
                                                    <div>
                                                        <Box variant="awsui-key-label">
                                                            Kendra additional query capacity
                                                        </Box>
                                                        <div>{knowledgeBase.kendraAdditionalQueryCapacity}</div>
                                                    </div>

                                                    <div>
                                                        <Box variant="awsui-key-label">
                                                            Kendra additional storage capacity
                                                        </Box>
                                                        <div>{knowledgeBase.kendraAdditionalStorageCapacity}</div>
                                                    </div>

                                                    <div>
                                                        <Box variant="awsui-key-label">Kendra edition</Box>
                                                        <div>{knowledgeBase.kendraEdition.label}</div>
                                                    </div>
                                                </ColumnLayout>
                                            </ExpandableSection>
                                        )}
                                    </Box>
                                }
                            >
                                <ColumnLayout columns={2} variant="text-grid">
                                    <div>
                                        <Box variant="awsui-key-label">Knowledge base type</Box>
                                        <div>{knowledgeBase.knowledgeBaseType.label}</div>
                                    </div>

                                    <div>
                                        <Box variant="awsui-key-label">Do you have an existing Kendra index?</Box>
                                        <div>{knowledgeBase.existingKendraIndex}</div>
                                    </div>

                                    {knowledgeBase.existingKendraIndex === 'yes' && (
                                        <div>
                                            <Box variant="awsui-key-label">Kendra index ID</Box>
                                            <div>{knowledgeBase.kendraIndexId}</div>
                                        </div>
                                    )}

                                    {knowledgeBase.existingKendraIndex === 'no' && (
                                        <div>
                                            <Box variant="awsui-key-label">New Kendra index name</Box>
                                            <div>{knowledgeBase.kendraIndexName}</div>
                                        </div>
                                    )}
                                </ColumnLayout>
                            </Container>
                        )}

                        {knowledgeBase.isRagRequired && (
                            <Container
                                header={
                                    <Header variant="h2" headingTagOverride="h3">
                                        Advanced RAG configurations
                                    </Header>
                                }
                            >
                                <ColumnLayout columns={2} variant="text-grid">
                                    <div>
                                        <Box variant="awsui-key-label">Maximum number of documents</Box>
                                        <div>{knowledgeBase.maxNumDocs}</div>
                                    </div>
                                </ColumnLayout>
                            </Container>
                        )}
                    </SpaceBetween>
                </SpaceBetween>
            </SpaceBetween>
        </Box>
    );
};

export default Review;
