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
import { Input, InputProps, FormField } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../interfaces';
import { MAX_KNOWLEDGE_BASE_NUM_DOCS, MIN_KNOWLEDGE_BASE_NUM_DOCS } from '../../../../utils/constants';
import { updateNumFieldsInError } from '../../utils';
import { InfoLink } from '../../../commons';
import { TOOLS_CONTENT } from '../../tools-content';

const { knowledgeBase: knowledgeBaseToolsContent } = TOOLS_CONTENT;

export interface RetrieveDocumentCountProps extends BaseFormComponentProps {
    knowledgeBaseData: any;
}

export const RetrieveDocumentCount = (props: RetrieveDocumentCountProps) => {
    const [maxNumDocsError, setMaxNumDocsError] = React.useState('');

    const onMaxNumDocsChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ maxNumDocs: detail.value });
        let errors = '';
        if (!Number.isInteger(parseFloat(detail.value))) {
            errors += 'Must be a whole number. Can only include characters 0-9. ';
        } else if (
            parseFloat(detail.value) < MIN_KNOWLEDGE_BASE_NUM_DOCS ||
            parseFloat(detail.value) > MAX_KNOWLEDGE_BASE_NUM_DOCS
        ) {
            errors +=
                'Number must be between ' + MIN_KNOWLEDGE_BASE_NUM_DOCS + ' and ' + MAX_KNOWLEDGE_BASE_NUM_DOCS + '. ';
        }

        updateNumFieldsInError(errors, maxNumDocsError, props.setNumFieldsInError);
        setMaxNumDocsError(errors);
    };

    return (
        <FormField
            label="Maximum number of documents to retrieve"
            description="Optional: the max number of documents to use from the knowledge base."
            constraintText={'Min: ' + MIN_KNOWLEDGE_BASE_NUM_DOCS + ', Max: ' + MAX_KNOWLEDGE_BASE_NUM_DOCS}
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(knowledgeBaseToolsContent.maxNumDocs)}
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
