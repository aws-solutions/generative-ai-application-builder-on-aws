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

import { Container, FormField, Header, Select, SelectProps } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../interfaces';
import { InfoLink } from '../../commons';
import { KNOWLEDGE_BASE_TYPES } from '../steps-config';
import { TOOLS_CONTENT } from '../tools-content';

const { knowledgeBase: knowledgeBaseToolsContent } = TOOLS_CONTENT;

interface KnowledgeBaseTypeProps extends BaseFormComponentProps {
    knowledgeBaseData: any;
}

export const KnowledgeBaseType = (props: KnowledgeBaseTypeProps) => {
    const onKnowledgeBaseTypeChange = (detail: SelectProps.ChangeDetail) => {
        props.onChangeFn({
            KnowledgeBaseType: detail.selectedOption.value
        });
    };

    return (
        <Container
            header={<Header variant="h2">Select Knowledge Base</Header>}
            data-testid="select-knowledgebase-type-container"
        >
            <FormField
                label="Knowledge base type"
                info={
                    <InfoLink
                        onFollow={() => props.setHelpPanelContent!(knowledgeBaseToolsContent.default)}
                        ariaLabel={'Information about different knowledge bases.'}
                    />
                }
                description="Select a supported knowledge base to attach to the deployment."
            >
                <Select
                    options={KNOWLEDGE_BASE_TYPES}
                    onChange={({ detail }) => onKnowledgeBaseTypeChange(detail)}
                    selectedAriaLabel="Selected"
                    selectedOption={props.knowledgeBaseData.knowledgeBaseType}
                />
            </FormField>
        </Container>
    );
};

export default KnowledgeBaseType;
