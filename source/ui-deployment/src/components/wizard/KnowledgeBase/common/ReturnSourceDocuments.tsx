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

import { Box, FormField, RadioGroup, RadioGroupProps } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../interfaces';
import { InfoLink } from '../../../commons';
import { getBooleanString } from '../../utils';

interface ReturnSourceDocumentsProps extends BaseFormComponentProps {
    knowledgeBaseData: any;
}

export const ReturnSourceDocuments = (props: ReturnSourceDocumentsProps) => {
    const onReturnDocumentSource = (detail: RadioGroupProps.ChangeDetail) => {
        const returnDocumentSource = detail.value === 'Yes';

        props.onChangeFn({ 'returnDocumentSource': returnDocumentSource });
    };
    return (
        <FormField
            label="Display document source?"
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(returnSourceDocumentsInfoPanel)}
                    ariaLabel={'Information about displaying the source of documents used for RAG '}
                />
            }
            stretch={true}
            data-testid="display-document-source-field"
            description="Display the source of the indexed documents used for RAG by the model"
        >
            <RadioGroup
                onChange={({ detail }) => onReturnDocumentSource(detail)}
                items={[
                    {
                        value: 'Yes',
                        label: 'Yes'
                    },
                    {
                        value: 'No',
                        label: 'No'
                    }
                ]}
                value={getBooleanString(props.knowledgeBaseData.returnDocumentSource)}
                data-testid="display-document-source-radio-group"
            />
        </FormField>
    );
};

const returnSourceDocumentsInfoPanel = {
    title: 'Return source documents',
    content: (
        <div>
            <Box variant="p">
                If enabled, outputs will include the source documents from RAG and their details including title, id,
                the specific excerpt, location, and score.
            </Box>

            <Box variant="p">
                For more details on Kendra, see the{' '}
                <a href="https://docs.aws.amazon.com/kendra/latest/APIReference/API_Retrieve.html">
                    Kendra Retrieve API
                </a>
                .
            </Box>
            <Box variant="p">
                For Bedrock, see{' '}
                <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html">
                    Bedrock knowledge base query configurations
                </a>
                .
            </Box>
        </div>
    ),
    links: [
        {
            href: 'https://docs.aws.amazon.com/kendra/latest/APIReference/API_Retrieve.html',
            text: 'Kendra Retrieve API'
        },
        {
            href: 'https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html',
            text: 'Bedrock Knowledge Base Query Configurations'
        },
        {
            href: 'https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_Retrieve.html',
            text: 'Bedrock Agent Runtime Retrieve API'
        }
    ]
};

export default ReturnSourceDocuments;
