// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { InfoLink } from '@/components/commons';
import { AdvancedKnowledgeBaseConfigProps } from '@/components/wizard/interfaces/Steps';
import {
    BEDROCK_KNOWLEDGE_BASE_OVERRIDE_SEARCH_TYPES,
    KNOWLEDGE_BASE_PROVIDERS
} from '@/components/wizard/steps-config';

import {
    Alert,
    Box,
    FormField,
    RadioGroup,
    RadioGroupProps,
    Select,
    SelectProps,
    SpaceBetween
} from '@cloudscape-design/components';
import React from 'react';

export const OverrideSearchType = (props: AdvancedKnowledgeBaseConfigProps) => {
    const initUseOverrideSearchType = () => {
        if (props.knowledgeBaseData.bedrockOverrideSearchType) {
            return 'true';
        }
        return 'false';
    };
    const onUseOverrideSearchTypeChange = (detail: RadioGroupProps.ChangeDetail) => {
        setIsUsingOverrideSearchTypeOption(detail.value);
        props.onChangeFn({
            bedrockOverrideSearchType: detail.value === 'true' ? BEDROCK_KNOWLEDGE_BASE_OVERRIDE_SEARCH_TYPES[0] : null
        });
    };

    const [isUsingOverrideSearchTypeOption, setIsUsingOverrideSearchTypeOption] =
        React.useState(initUseOverrideSearchType);

    const onOverrideSearchTypeChange = (detail: SelectProps.ChangeDetail) => {
        props.onChangeFn({
            bedrockOverrideSearchType: detail.selectedOption
        });
    };

    return (
        <FormField
            label={<span>Override Search Type</span>}
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(overrideSearchTypeInfoPanel)}
                    ariaLabel={'Information about the Bedrock Knowledge Base Override Search Type Option'}
                />
            }
            description="Overrides the default knowledge base search behavior to use hybrid or semantic search"
            data-testid="input-bedrock-knowledge-base-override-search-type"
        >
            <SpaceBetween size="l">
                <Alert statusIconAriaLabel="Info" header="Override Search Type Compatibility">
                    This parameter is only compatible with Knowledge Bases for Amazon Bedrock which use OpenSearch
                    Serverless as a backing vector store. Using this option with other vector stores will result in a
                    runtime error in the chat.
                </Alert>
                <RadioGroup
                    onChange={({ detail }) => onUseOverrideSearchTypeChange(detail)}
                    items={[
                        {
                            value: 'true',
                            label: 'Yes'
                        },
                        {
                            value: 'false',
                            label: 'No'
                        }
                    ]}
                    value={isUsingOverrideSearchTypeOption}
                />
                {props.knowledgeBaseData.knowledgeBaseType.value === KNOWLEDGE_BASE_PROVIDERS.bedrock &&
                    isUsingOverrideSearchTypeOption === 'true' && (
                        <Select
                            selectedOption={props.knowledgeBaseData.bedrockOverrideSearchType}
                            onChange={({ detail }) => onOverrideSearchTypeChange(detail)}
                            options={BEDROCK_KNOWLEDGE_BASE_OVERRIDE_SEARCH_TYPES}
                            selectedAriaLabel="Selected"
                        />
                    )}
            </SpaceBetween>
        </FormField>
    );
};

export default OverrideSearchType;

const overrideSearchTypeInfoPanel = {
    title: 'OverrideSearchType',
    content: (
        <div>
            <Box variant="p">
                By default, Amazon Bedrock decides a search strategy for you. If you're using an Amazon OpenSearch
                Serverless vector store that contains a filterable text field, you can specify whether to query the
                knowledge base with a HYBRID search using both vector embeddings and raw text, or SEMANTIC search using
                only vector embeddings. For other vector store configurations, only SEMANTIC search is available. If you
                provide a value here and you are not using an OpenSearch vector store for your knowledge base, you will
                see errors at runtime.
            </Box>
        </div>
    ),
    links: [
        {
            href: 'https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html',
            text: 'Override Search Type Documentation'
        }
    ]
};
