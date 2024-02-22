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
import { WIZARD_PAGE_INDEX } from '../steps-config';

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
                            <div>{props.knowledgeBaseData.isRagRequired ? 'Yes' : 'No'}</div>
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
                            <Box>
                                {props.knowledgeBaseData.existingKendraIndex === 'no' && (
                                    <ExpandableSection headerText="Additional options" variant="footer">
                                        <ColumnLayout columns={2} variant="text-grid">
                                            <div>
                                                <Box variant="awsui-key-label">Kendra additional query capacity</Box>
                                                <div>{props.knowledgeBaseData.kendraAdditionalQueryCapacity}</div>
                                            </div>

                                            <div>
                                                <Box variant="awsui-key-label">Kendra additional storage capacity</Box>
                                                <div>{props.knowledgeBaseData.kendraAdditionalStorageCapacity}</div>
                                            </div>

                                            <div>
                                                <Box variant="awsui-key-label">Kendra edition</Box>
                                                <div>{props.knowledgeBaseData.kendraEdition.label}</div>
                                            </div>
                                        </ColumnLayout>
                                    </ExpandableSection>
                                )}
                            </Box>
                        }
                        data-testid="knowledge-base-options-container"
                    >
                        <ColumnLayout columns={2} variant="text-grid">
                            <div>
                                <Box variant="awsui-key-label">Knowledge base type</Box>
                                <div>{props.knowledgeBaseData.knowledgeBaseType.label}</div>
                            </div>

                            <div>
                                <Box variant="awsui-key-label">Do you have an existing Kendra index?</Box>
                                <div>{props.knowledgeBaseData.existingKendraIndex}</div>
                            </div>

                            {props.knowledgeBaseData.existingKendraIndex === 'yes' && (
                                <div>
                                    <Box variant="awsui-key-label">Kendra index ID</Box>
                                    <div>{props.knowledgeBaseData.kendraIndexId}</div>
                                </div>
                            )}

                            {props.knowledgeBaseData.existingKendraIndex === 'no' && (
                                <div>
                                    <Box variant="awsui-key-label">New Kendra index name</Box>
                                    <div>{props.knowledgeBaseData.kendraIndexName}</div>
                                </div>
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
                            <div>
                                <Box variant="awsui-key-label">Maximum number of documents</Box>
                                <div>{props.knowledgeBaseData.maxNumDocs}</div>
                            </div>

                            <div>
                                <Box variant="awsui-key-label">Display document source</Box>
                                <div>{props.knowledgeBaseData.returnDocumentSource ? 'Yes' : 'No'}</div>
                            </div>
                        </ColumnLayout>
                    </Container>
                )}
            </SpaceBetween>
        </SpaceBetween>
    );
};

export default KnowledgeBaseReview;
