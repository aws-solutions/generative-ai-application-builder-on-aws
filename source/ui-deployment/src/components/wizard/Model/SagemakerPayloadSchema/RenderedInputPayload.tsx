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

import { useEffect, useState } from 'react';
import { BaseFormComponentProps } from '../../interfaces';
import { Box, FormField } from '@cloudscape-design/components';

import 'ace-builds/css/ace.css';
import 'ace-builds/css/theme/dawn.css';
import 'ace-builds/css/theme/tomorrow_night_bright.css';
import { modelParamsToJson, replaceInTemplate } from './helpers';
import { FormattedModelParamsAttribute } from '../helpers';
import { MarkdownRenderer } from './RenderedMarkdown';

export interface RenderedInputPayloadProps extends BaseFormComponentProps {
    modelData: any;
}

const renderPayload = (inputSchema: string, modelData: any): string => {
    try {
        const modelParameters: FormattedModelParamsAttribute[] = modelData.modelParameters;

        if (!inputSchema || inputSchema === '') {
            return '';
        }

        const reservedValuesMap = {
            temperature: modelData.temperature
        };

        const modelParamsJson = modelParamsToJson(modelParameters);
        return JSON.stringify(replaceInTemplate(inputSchema, modelParamsJson, reservedValuesMap), null, 4);
    } catch (err) {
        return inputSchema;
    }
};

export const RenderedInputPayload = (props: RenderedInputPayloadProps) => {
    const [value, setValue] = useState(renderPayload(props.modelData.sagemakerInputSchema, props.modelData));

    useEffect(() => {
        const renPayload = renderPayload(props.modelData.sagemakerInputSchema, props.modelData);
        setValue(renPayload);
    }, [props.modelData.modelProvider, props.modelData.sagemakerInputSchema, props.modelData.modelParameters]);

    // convert value string into a markdown string
    const valueAsMarkdown = value.replace(/\\n/g, '\n');
    const valueAsMarkdownString = `\`\`\`json\n${valueAsMarkdown}\n\`\`\``;

    return (
        <FormField
            label={<span>Rendered Input Payload</span>}
            data-testid="sagemaker-input-payload-rendered-field"
            description="Rendered payload with the provided prompt and model parameters."
        >
            <Box data-testid="markdown-rendered-string">
                <MarkdownRenderer>{valueAsMarkdownString}</MarkdownRenderer>
            </Box>
        </FormField>
    );
};

export default RenderedInputPayload;
