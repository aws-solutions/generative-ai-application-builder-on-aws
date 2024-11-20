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

import React from 'react';
import { Input, InputProps, FormField, SpaceBetween, Box } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../interfaces';
import { updateNumFieldsInError } from '../../utils';
import { InfoLink } from '../../../commons';
import { KNOWLEDGE_BASE_NUM_DOCS_MAP } from '../../steps-config';
import { IG_DOCS } from '@/utils/constants';

export interface RetrieveDocumentCountProps extends BaseFormComponentProps {
    knowledgeBaseData: any;
}

export const RetrieveDocumentCount = (props: RetrieveDocumentCountProps) => {
    const [maxNumDocsError, setMaxNumDocsError] = React.useState('');

    const minNumDocs = KNOWLEDGE_BASE_NUM_DOCS_MAP[props.knowledgeBaseData.knowledgeBaseType.value].min;
    const maxNumDocs = KNOWLEDGE_BASE_NUM_DOCS_MAP[props.knowledgeBaseData.knowledgeBaseType.value].max;

    const onMaxNumDocsChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ maxNumDocs: detail.value });
        let errors = '';
        if (!Number.isInteger(parseFloat(detail.value))) {
            errors += 'Must be a whole number. Can only include characters 0-9. ';
        } else if (parseFloat(detail.value) < minNumDocs || parseFloat(detail.value) > maxNumDocs) {
            errors += 'Number must be between ' + minNumDocs + ' and ' + maxNumDocs + '. ';
        }

        updateNumFieldsInError(errors, maxNumDocsError, props.setNumFieldsInError);
        setMaxNumDocsError(errors);
    };

    return (
        <FormField
            label="Maximum number of documents to retrieve"
            description="Optional: the max number of documents to use from the knowledge base."
            constraintText={'Min: ' + minNumDocs + ', Max: ' + maxNumDocs}
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(maxNumDocsInfoPanel)}
                    ariaLabel={'Information about max documents to retrieve.'}
                />
            }
            errorText={maxNumDocsError}
            data-testid="input-max-num-docs"
        >
            <Input
                type="number"
                onChange={({ detail }) => onMaxNumDocsChange(detail)}
                value={props.knowledgeBaseData.maxNumDocs}
                autoComplete={false}
            />
        </FormField>
    );
};
export default RetrieveDocumentCount;

//INFO PANEL CONTENT
const maxNumDocsInfoPanel = {
    title: 'Number of documents to retrieve',
    content: (
        <SpaceBetween size="xs">
            <Box variant="p">
                This setting is used to control the maximum number of document excerpts that can be used as context for
                a single query. If the number of documents returned by the knowledge base exceeds this maximum, only the
                max number set here will be passed through.
            </Box>
        </SpaceBetween>
    ),
    links: [
        {
            href: IG_DOCS.TIPS_PROMPT_LIMITS,
            text: 'Tips for managing prompt limits'
        }
    ]
};
