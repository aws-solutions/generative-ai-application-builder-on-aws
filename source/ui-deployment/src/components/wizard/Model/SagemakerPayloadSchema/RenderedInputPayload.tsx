// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react';
import { BaseFormComponentProps } from '../../interfaces';
import { Box, FormField } from '@cloudscape-design/components';

import 'ace-builds/css/ace.css';
import 'ace-builds/css/theme/dawn.css';
import 'ace-builds/css/theme/tomorrow_night_bright.css';
import { modelParamsToJson, replaceInTemplate } from './helpers';
import { FormattedModelParamsAttribute } from '../helpers';
import JsonCodeView from '@/components/commons/json-code-view';

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

    return (
        <FormField
            label={<span>Rendered Input Payload</span>}
            data-testid="sagemaker-input-payload-rendered-field"
            description="Rendered payload with the provided prompt and model parameters."
        >
            <Box data-testid="markdown-rendered-string">
                <JsonCodeView content={value}></JsonCodeView>
            </Box>
        </FormField>
    );
};

export default RenderedInputPayload;
