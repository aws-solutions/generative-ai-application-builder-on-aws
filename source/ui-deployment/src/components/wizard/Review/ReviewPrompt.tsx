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

import { useModelInfoQuery } from 'hooks/useQueries';
import { Box, Spinner } from '@cloudscape-design/components';
import InvalidPromptWarning from './InvalidPromptWarning';
import { escapedNewLineToLineBreakTag } from 'components/useCaseDetails/common-components';
import { useComponentId } from 'components/commons/use-component-id';
import { useContext } from 'react';
import { HomeContext } from 'contexts';
import { DEPLOYMENT_ACTIONS } from 'utils/constants';

export interface ReviewPromptProps {
    promptTemplate: string;
    modelProvider: string;
    modelName: string;
    isRagEnabled: boolean;
}

const useSelectSystemPrompt = (
    formInputSystemPrompt: string,
    modelProvider: string,
    modelName: string,
    isRagEnabled: boolean
) => {
    const response = useModelInfoQuery(modelProvider, modelName, isRagEnabled ? 'RAGChat' : 'Chat');
    if (formInputSystemPrompt === undefined || formInputSystemPrompt === '') {
        if (response.isSuccess) {
            return { ...response, sysPrompt: response.data.Prompt };
        }

        if (response.isError) {
            console.error(response.error);
        }
    }
    return { ...response, sysPrompt: formInputSystemPrompt };
};

export const validatePrompt = (prompt: string, isRagEnabled: boolean): boolean => {
    if (isRagEnabled) {
        return prompt.includes('{context}') && prompt.includes('{history}') && prompt.includes('{input}');
    }
    return prompt.includes('{history}') && prompt.includes('{input}');
};

export const ReviewPrompt = (props: ReviewPromptProps) => {
    const {
        state: { deploymentAction }
    } = useContext(HomeContext);

    const { isPending, sysPrompt } = useSelectSystemPrompt(
        props.promptTemplate,
        props.modelProvider,
        props.modelName,
        props.isRagEnabled
    );

    const isPromptValid = validatePrompt(sysPrompt, props.isRagEnabled);
    const componentId = useComponentId();

    if (isPending) {
        return <Spinner data-testid="review-prompt-pending-spinner" />;
    }

    if ((deploymentAction === DEPLOYMENT_ACTIONS.EDIT && props.promptTemplate === '') || !isPromptValid) {
        return <InvalidPromptWarning />;
    } else {
        return (
            <Box variant="code" data-testid="review-system-prompt">
                {escapedNewLineToLineBreakTag(sysPrompt, componentId)}
            </Box>
        );
    }
};

export default ReviewPrompt;
