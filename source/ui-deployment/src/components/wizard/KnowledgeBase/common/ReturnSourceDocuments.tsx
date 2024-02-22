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

import { FormField, RadioGroup, RadioGroupProps } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../interfaces';
import { InfoLink } from '../../../commons';
import { TOOLS_CONTENT } from '../../tools-content';

const { knowledgeBase: knowledgeBaseToolsContent } = TOOLS_CONTENT;

interface ReturnSourceDocumentsProps extends BaseFormComponentProps {
    knowledgeBaseData: any;
}

export const ReturnSourceDocuments = (props: ReturnSourceDocumentsProps) => {
    const onReturnDocumentSource = (detail: RadioGroupProps.ChangeDetail) => {
        const returnDocumentSource = detail.value === 'yes';

        props.onChangeFn({ 'returnDocumentSource': returnDocumentSource });
    };
    return (
        <FormField
            label="Display document source?"
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(knowledgeBaseToolsContent.kendraIndex)}
                    ariaLabel={'Information about displaying the source of documents used for RAG '}
                />
            }
            stretch={true}
            data-testid="display-document-source-field"
            description="Optional: Display the source of the indexed documents used for RAG by the model"
        >
            <RadioGroup
                onChange={({ detail }) => onReturnDocumentSource(detail)}
                items={[
                    {
                        value: 'yes',
                        label: 'Yes'
                    },
                    {
                        value: 'no',
                        label: 'No'
                    }
                ]}
                value={props.knowledgeBaseData.returnDocumentSource ? 'yes' : 'no'}
                data-testid="display-document-source-radio-group"
            />
        </FormField>
    );
};

export default ReturnSourceDocuments;
