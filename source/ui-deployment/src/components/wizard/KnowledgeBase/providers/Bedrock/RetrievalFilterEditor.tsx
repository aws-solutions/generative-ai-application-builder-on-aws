// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { KnowledgeBaseConfigProps } from '@/components/wizard/interfaces/Steps';
import QueryFilterJsonEditor from '../../common/QueryFilterJsonEditor';
import { Box } from '@cloudscape-design/components';
import { IG_DOCS } from '@/utils/constants';
import { InfoLink } from '@/components/commons';

export const RetrievalFilterEditor = (props: KnowledgeBaseConfigProps) => {
    return (
        <QueryFilterJsonEditor
            label={
                <span>
                    Retrieval Filter <i>- optional</i>
                </span>
            }
            data-testid="bedrock-retrieval-filter"
            description="Filters the search results based on document attributes or fields. This filter is included with every Amazon Bedrock Knowledge Base query."
            infoLinkContent={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(bedrockRetrievalFilterInfoPanel)}
                    ariaLabel="Information about Kendra Attribute Editor"
                />
            }
            {...props}
        />
    );
};

const bedrockRetrievalFilterInfoPanel = {
    title: 'Retrieval Filter',
    content: (
        <Box variant="p">
            The query filter is a JSON object that can be used to filter the results returned by the knowledge base.
        </Box>
    ),
    links: [
        {
            href: IG_DOCS.BEDROCK_RETRIEVAL_FILTER,
            text: 'Querying with Retrieval Filters'
        }
    ]
};

export default RetrievalFilterEditor;
