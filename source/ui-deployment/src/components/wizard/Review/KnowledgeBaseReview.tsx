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
    ExpandableSection
} from '@cloudscape-design/components';
import { ReviewSectionProps } from '../interfaces/Steps';
import { DEFAULT_STEP_INFO, KNOWLEDGE_BASE_PROVIDERS, WIZARD_PAGE_INDEX } from '../steps-config';
import JsonCodeView from '@/components/commons/json-code-view';
import { ValueWithLabel } from '@/components/useCaseDetails/common-components';
import { scoreToKendraMapping } from '../KnowledgeBase/helpers';
import { getBooleanString } from '../utils';

interface KnowledgeBaseReviewProps extends ReviewSectionProps {
    knowledgeBaseData: any;
}

export const KnowledgeBaseReview = (props: KnowledgeBaseReviewProps) => {
    return (
        <SpaceBetween size="xs" data-testid="review-knowledge-base-container">
            <Header
                variant="h3"
                headingTagOverride="h2"
                actions={
                    <Button
                        className="edit-step-btn"
                        onClick={() => props.setActiveStepIndex(WIZARD_PAGE_INDEX.KNOWLEDGE_BASE)}
                    >
                        Edit
                    </Button>
                }
            >
                {props.header}
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
                            <div>{getBooleanString(props.knowledgeBaseData.isRagRequired)}</div>
                        </div>
                    </ColumnLayout>
                </Container>
                {props.knowledgeBaseData.isRagRequired && (
                    <Container
                        header={
                            <Header variant="h2" headingTagOverride="h3">
                                Knowledge base options
                            </Header>
                        }
                        footer={
                            props.knowledgeBaseData.existingKendraIndex === 'No' && (
                                <Box>
                                    {
                                        <ExpandableSection headerText="Additional options" variant="footer">
                                            <ColumnLayout columns={2} variant="text-grid">
                                                <ValueWithLabel label="Kendra edition">
                                                    {props.knowledgeBaseData.kendraEdition.label}
                                                </ValueWithLabel>

                                                <ValueWithLabel label="Kendra additional query capacity">
                                                    {props.knowledgeBaseData.kendraAdditionalQueryCapacity}
                                                </ValueWithLabel>

                                                <ValueWithLabel label="Kendra additional storage capacity">
                                                    {props.knowledgeBaseData.kendraAdditionalStorageCapacity}
                                                </ValueWithLabel>
                                            </ColumnLayout>
                                        </ExpandableSection>
                                    }
                                </Box>
                            )
                        }
                        data-testid="knowledge-base-options-container"
                    >
                        <ColumnLayout columns={2} variant="text-grid">
                            <ValueWithLabel label="Knowledge base type">
                                {props.knowledgeBaseData.knowledgeBaseType.label}
                            </ValueWithLabel>

                            {props.knowledgeBaseData.knowledgeBaseType.value === KNOWLEDGE_BASE_PROVIDERS.kendra && (
                                <>
                                    <ValueWithLabel label="Do you have an existing Kendra index?">
                                        {props.knowledgeBaseData.existingKendraIndex}
                                    </ValueWithLabel>

                                    {props.knowledgeBaseData.existingKendraIndex === 'Yes' && (
                                        <ValueWithLabel label="Kendra index ID">
                                            {props.knowledgeBaseData.kendraIndexId}
                                        </ValueWithLabel>
                                    )}

                                    {props.knowledgeBaseData.existingKendraIndex === 'No' && (
                                        <ValueWithLabel label="New Kendra index name">
                                            {props.knowledgeBaseData.kendraIndexName}
                                        </ValueWithLabel>
                                    )}
                                </>
                            )}

                            {props.knowledgeBaseData.knowledgeBaseType.value === KNOWLEDGE_BASE_PROVIDERS.bedrock && (
                                <>
                                    <ValueWithLabel label="Bedrock Knowledge Base ID">
                                        {props.knowledgeBaseData.bedrockKnowledgeBaseId}
                                    </ValueWithLabel>
                                </>
                            )}
                        </ColumnLayout>
                    </Container>
                )}

                {props.knowledgeBaseData.isRagRequired && (
                    <Container
                        header={
                            <Header variant="h2" headingTagOverride="h3">
                                Advanced RAG configurations
                            </Header>
                        }
                        data-testid="advanced-rag-configs-container"
                    >
                        <ColumnLayout columns={2} variant="text-grid">
                            <ValueWithLabel label="Maximum number of documents">
                                {props.knowledgeBaseData.maxNumDocs}
                            </ValueWithLabel>

                            <ValueWithLabel label="Score Threshold">
                                {props.knowledgeBaseData.knowledgeBaseType.value === KNOWLEDGE_BASE_PROVIDERS.kendra
                                    ? scoreToKendraMapping(props.knowledgeBaseData.scoreThreshold)
                                    : props.knowledgeBaseData.scoreThreshold}
                            </ValueWithLabel>

                            <ValueWithLabel label="Static response when no documents found">
                                {props.knowledgeBaseData.noDocsFoundResponse
                                    ? props.knowledgeBaseData.noDocsFoundResponse
                                    : '-'}
                            </ValueWithLabel>

                            <ValueWithLabel label="Display document source">
                                {getBooleanString(props.knowledgeBaseData.returnDocumentSource)}
                            </ValueWithLabel>

                            <ValueWithLabel label="Role based access control enabled?">
                                {getBooleanString(props.knowledgeBaseData.enableRoleBasedAccessControl)}
                            </ValueWithLabel>

                            {props.knowledgeBaseData.bedrockOverrideSearchType && (
                                <ValueWithLabel label="Override Search Type">
                                    {props.knowledgeBaseData.bedrockOverrideSearchType.label}
                                </ValueWithLabel>
                            )}

                            {props.knowledgeBaseData.queryFilter !== DEFAULT_STEP_INFO.knowledgeBase.queryFilter && (
                                <div data-testid="query-filter-review">
                                    {props.knowledgeBaseData.knowledgeBaseType.value ===
                                        KNOWLEDGE_BASE_PROVIDERS.bedrock && (
                                        <Box variant="awsui-key-label">Retrieval filter</Box>
                                    )}

                                    {props.knowledgeBaseData.knowledgeBaseType.value ===
                                        KNOWLEDGE_BASE_PROVIDERS.kendra && (
                                        <Box variant="awsui-key-label">Attribute filter</Box>
                                    )}

                                    <JsonCodeView content={props.knowledgeBaseData.queryFilter} />
                                </div>
                            )}
                        </ColumnLayout>
                    </Container>
                )}
            </SpaceBetween>
        </SpaceBetween>
    );
};

export default KnowledgeBaseReview;
