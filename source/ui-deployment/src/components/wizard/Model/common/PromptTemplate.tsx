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

import { FormField, Textarea, TextareaProps } from '@cloudscape-design/components';
import React from 'react';
import { InfoLink } from '../../../commons';
import { TOOLS_CONTENT } from '../../tools-content';
import { MAX_PROMPT_TEMPLATE_LENGTH } from '../../../../utils/constants';
import { updateNumFieldsInError } from '../../utils';
import { BaseFormComponentProps } from '../../interfaces/BaseFormComponent';

export interface PropTemplateProps extends BaseFormComponentProps {
    modelData: any;
}

const { model: modelToolsContent } = TOOLS_CONTENT;

export const PromptTemplate = (props: PropTemplateProps) => {
    const [promptTemplateError, setPromptTemplateError] = React.useState('');

    const onPromptTemplateChange = (detail: TextareaProps.ChangeDetail) => {
        props.onChangeFn({ promptTemplate: detail.value });
        let errors = '';
        if (detail.value !== '' && detail.value.length > MAX_PROMPT_TEMPLATE_LENGTH) {
            errors += `Prompt template can have a maximum of ${MAX_PROMPT_TEMPLATE_LENGTH} characters`;
        }
        updateNumFieldsInError(errors, promptTemplateError, props.setNumFieldsInError);
        setPromptTemplateError(errors);
    };

    return (
        <FormField
            label="Prompt Template"
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(modelToolsContent.promptTemplate)}
                    ariaLabel={'Information about system prompts.'}
                />
            }
            description="Optional: a custom prompt template to use for the deployment. Please refer to the info link to learn about prompt placeholders. 
                                    {history} and {input} are mandatory. You will also require {context} if you are using RAG."
            errorText={promptTemplateError}
            data-testid="model-system-prompt-field"
        >
            <Textarea
                placeholder="Optional"
                value={props.modelData.promptTemplate}
                onChange={({ detail }) => onPromptTemplateChange(detail)}
                rows={10}
                data-testid="model-system-prompt-input"
            />
        </FormField>
    );
};

export default PromptTemplate;
