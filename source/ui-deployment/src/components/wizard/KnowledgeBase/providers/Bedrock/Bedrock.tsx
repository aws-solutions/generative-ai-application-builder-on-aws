// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { KnowledgeBaseConfigProps } from '@/components/wizard/interfaces/Steps';
import { Container, Header, SpaceBetween } from '@cloudscape-design/components';
import BedrockKnowledgeBaseId from './BedrockKnowledgeBaseId';

export const BedrockKnowledgeBase = (props: KnowledgeBaseConfigProps) => {
    return (
        <Container
            header={<Header variant="h2">Knowledge base configuration</Header>}
            data-testid="bedrock-knowledgebase-container"
        >
            <SpaceBetween size="l">
                <BedrockKnowledgeBaseId {...props} />
            </SpaceBetween>
        </Container>
    );
};

export default BedrockKnowledgeBase;
