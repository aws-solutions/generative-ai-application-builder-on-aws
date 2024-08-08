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

import { AdvancedKnowledgeBaseConfigProps } from '../interfaces/Steps';
import { Container, Header, SpaceBetween } from '@cloudscape-design/components';
import { RetrieveDocumentCount } from './common/RetrieveDocumentCount';
import { ReturnSourceDocuments } from './common/ReturnSourceDocuments';
import { EnableRoleBasedAccessControl } from './common/EnableRoleBasedAccessControl';
import { KNOWLEDGE_BASE_PROVIDERS } from '../steps-config';
import { AttributeFilterEditor } from './providers/Kendra/AttributeFilterEditor';
import RetrievalFilterEditor from './providers/Bedrock/RetrievalFilterEditor';
import OverrideSearchType from './providers/Bedrock/OverrideSearchType';
import ScoreThreshold from './common/ScoreThreshold';
import NoDocsFoundResponse from './common/NoDocsFoundResponse';

export const AdvancedKnowledgeBaseConfig = (props: AdvancedKnowledgeBaseConfigProps) => {
    return (
        <Container
            header={<Header variant="h2">Advanced RAG configurations</Header>}
            data-testid="advanced-knowledgebase-config-container"
        >
            <SpaceBetween size="l">
                <RetrieveDocumentCount {...props} />
                <ScoreThreshold
                    scoreThreshold={props.knowledgeBaseData.scoreThreshold}
                    knowledgeBaseProvider={props.knowledgeBaseData.knowledgeBaseType.value}
                    data-testid="knowledge-base-score-threshold"
                    {...props}
                />
                <NoDocsFoundResponse
                    noDocsFoundResponse={props.knowledgeBaseData.noDocsFoundResponse}
                    data-testid="knowledge-base-no-docs-found-response"
                    {...props}
                />
                <ReturnSourceDocuments {...props} />
                {props.knowledgeBaseData.knowledgeBaseType.value === KNOWLEDGE_BASE_PROVIDERS.kendra && (
                    <>
                        <EnableRoleBasedAccessControl {...props} />
                        <AttributeFilterEditor {...props} />
                    </>
                )}
                {props.knowledgeBaseData.knowledgeBaseType.value === KNOWLEDGE_BASE_PROVIDERS.bedrock && (
                    <>
                        <RetrievalFilterEditor {...props} />
                        <OverrideSearchType {...props} />
                    </>
                )}
            </SpaceBetween>
        </Container>
    );
};

export default AdvancedKnowledgeBaseConfig;
