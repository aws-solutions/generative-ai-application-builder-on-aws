// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
