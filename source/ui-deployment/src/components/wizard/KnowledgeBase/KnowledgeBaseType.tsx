// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Container, FormField, Header, Select, SelectProps } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../interfaces';
import { InfoLink } from '../../commons';
import { KNOWLEDGE_BASE_TYPES } from '../steps-config';
import { knowledgeBaseInfoPanel } from './helpers';

interface KnowledgeBaseTypeProps extends BaseFormComponentProps {
    knowledgeBaseData: any;
}

export const KnowledgeBaseType = (props: KnowledgeBaseTypeProps) => {
    const onKnowledgeBaseTypeChange = (detail: SelectProps.ChangeDetail) => {
        props.onChangeFn({
            knowledgeBaseType: detail.selectedOption
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
                        onFollow={() => props.setHelpPanelContent!(knowledgeBaseInfoPanel.default)}
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
