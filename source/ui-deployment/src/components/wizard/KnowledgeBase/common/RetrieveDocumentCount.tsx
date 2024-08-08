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
import { updateNumFieldsInError } from '../../utils';
import { InfoLink } from '../../../commons';
import { TOOLS_CONTENT } from '../../tools-content';
import { KNOWLEDGE_BASE_NUM_DOCS_MAP } from '../../steps-config';

const { knowledgeBase: knowledgeBaseToolsContent } = TOOLS_CONTENT;

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
