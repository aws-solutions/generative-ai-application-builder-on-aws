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

import { InfoLink } from '@/components/commons';
import { BaseFormComponentProps } from '@/components/wizard/interfaces';
import { updateNumFieldsInError } from '@/components/wizard/utils';
import { IG_DOCS } from '@/utils/constants';
import { Box, FormField, Input, InputProps } from '@cloudscape-design/components';
import React from 'react';

interface BedrockKnowledgeBaseIdProps extends BaseFormComponentProps {
    knowledgeBaseData: any;
}

export const BedrockKnowledgeBaseId = (props: BedrockKnowledgeBaseIdProps) => {
    const [bedrockKnowledgeBaseIdError, setBedrockKnowledgeBaseIdError] = React.useState('');

    const onIdChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ bedrockKnowledgeBaseId: detail.value });
        let errors = '';
        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }
        if (!detail.value.match(`^[0-9a-zA-Z]{10}$`)) {
            errors += 'Does not match pattern of a valid Bedrock Knowledge Base ID';
        }

        updateNumFieldsInError(errors, bedrockKnowledgeBaseIdError, props.setNumFieldsInError);
        setBedrockKnowledgeBaseIdError(errors);
    };

    return (
        <FormField
            label={
                <span>
                    Bedrock Knowledge Base ID - <i>required</i>
                </span>
            }
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(bedrockKnowledgeBaseIdInfoPanel)}
                    ariaLabel={'Information about the Bedrock Knowledge Base ID'}
                />
            }
            description="ID of an existing Bedrock Knowledge Base in the AWS account."
            constraintText="A valid Bedrock Knowledge Base ID must be provided. The ID can be found in the Bedrock console."
            errorText={bedrockKnowledgeBaseIdError}
            data-testid="input-bedrock-knowledge-base-id"
        >
            <Input
                placeholder="Bedrock Knowledge Base ID..."
                value={props.knowledgeBaseData.bedrockKnowledgeBaseId}
                onChange={({ detail }) => onIdChange(detail)}
                autoComplete={false}
                data-testid="input-bedrock-knowledge-base-id-input"
            />
        </FormField>
    );
};

const bedrockKnowledgeBaseIdInfoPanel = {
    title: 'Bedrock knowledge base ID',
    content: (
        <div>
            <Box variant="p">This solution can use an existing Bedrock knowledge base.</Box>

            <Box variant="p">
                You will need to provide the index id, which can be found on the Bedrock console. Please ensure the
                Bedrock knowledge base is populated with your desired data.
            </Box>

            <Box variant="p">
                <b>Note:</b> You may need to contact your AWS Account Administrator for help with certain actions such
                as ingesting documents into the index or deleting resources once they are no longer needed.
            </Box>
        </div>
    ),
    links: [
        {
            href: IG_DOCS.INGESTING_DATA,
            text: 'Ingesting data into your knowledge base'
        },
        {
            href: 'https://aws.amazon.com/bedrock/knowledge-bases/',
            text: 'Bedrock Knowledge Base'
        }
    ]
};

export default BedrockKnowledgeBaseId;
