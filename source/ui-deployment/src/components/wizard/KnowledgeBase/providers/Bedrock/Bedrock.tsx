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
