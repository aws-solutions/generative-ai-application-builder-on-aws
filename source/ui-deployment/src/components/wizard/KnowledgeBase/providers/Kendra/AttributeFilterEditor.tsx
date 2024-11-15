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
import QueryFilterJsonEditor from '../../common/QueryFilterJsonEditor';
import { Box } from '@cloudscape-design/components';
import { IG_DOCS } from '@/utils/constants';
import { InfoLink } from '@/components/commons';

export const AttributeFilterEditor = (props: KnowledgeBaseConfigProps) => {
    return (
        <QueryFilterJsonEditor
            label={
                <span>
                    Attribute Filter <i>- optional</i>
                </span>
            }
            data-testid="kendra-attribute-editor"
            description="Filters the search results based on document attributes or fields. This filter is included with every Amazon kendra query."
            infoLinkContent={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(kendraAttributeEditorInfoPanel)}
                    ariaLabel="Information about Kendra Attribute Editor"
                />
            }
            {...props}
        />
    );
};

const kendraAttributeEditorInfoPanel = {
    title: 'Kendra Attribute Filter',
    content: (
        <div>
            <Box variant="p">
                The query filter is a JSON object that can be used to filter the results returned by the knowledge base.
            </Box>
            <Box variant="p">
                For example, if you want to only show results that have a specific tag, you can use the query filter to
                filter the results.The attributes must exist in your index. For example, if your documents include the
                custom attribute "Department", you can filter documents that belong to the "HR" department. You would
                use the EqualsTo operation to filter results or documents with "Department" equals to "HR".
            </Box>
        </div>
    ),
    links: [
        {
            href: IG_DOCS.KENDRA_ATTRIBUTE_FILTER,
            text: 'Querying with Attribute Filters'
        },
        {
            href: 'https://docs.aws.amazon.com/kendra/latest/APIReference/API_AttributeFilter.html',
            text: 'Amazon Kendra AttributeFilter Reference'
        }
    ]
};

export default AttributeFilterEditor;
