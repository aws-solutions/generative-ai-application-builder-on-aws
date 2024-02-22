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

import { useEffect, useState, useRef } from 'react';
import { BaseFormComponentProps } from '../../interfaces';
import { CodeEditor, CodeEditorProps, FormField } from '@cloudscape-design/components';

import 'ace-builds/css/ace.css';
import 'ace-builds/css/theme/dawn.css';
import 'ace-builds/css/theme/tomorrow_night_bright.css';
import {
    INPUT_SCHEMA_RESERVED_KEYS,
    PROMPT_SCHEMA_REGEX,
    codeEditori18nStrings,
    modelParamsToJson,
    validateModelParamsInTemplate
} from './helpers';
import { InfoLink } from 'components/commons';
import { modelToolsContent } from '../helpers';

export interface InputSchemaProps extends BaseFormComponentProps {
    modelData: any;
}

const defaultInputSchema = (initInputSchema: string) => {
    if (initInputSchema === '') {
        return JSON.stringify(
            {
                input: INPUT_SCHEMA_RESERVED_KEYS.prompt,
                parameters: {
                    temperature: INPUT_SCHEMA_RESERVED_KEYS.temperature
                }
            },
            null,
            4
        );
    }

    return initInputSchema;
};

const formatValidationDetailToString = (detail: CodeEditorProps.ValidateDetail) => {
    if (detail.annotations.length === 1) {
        const annotation = detail.annotations[0];
        return `Line:${annotation.row} Error: ${annotation.text}`;
    }

    detail.annotations.sort((a, b) => a.row! - b.row!); // sort by row number
    detail.annotations.sort((a, b) => a.column! - b.column!); // sort by column number

    const errorMessages: string[] = [];

    detail.annotations.forEach((annotation) => {
        if (annotation.type === 'error') {
            errorMessages.push(`Line:${annotation.row}:Error: ${annotation.text}`);
        }
    });

    return JSON.stringify(errorMessages);
};

/**
 * Checks if only the prompt template string is present only once in the template
 * @param matches regex match result for the prompt input template string
 * @returns
 */
const isPromptTemplatePresentOnce = (sagemakerInputSchema: string): boolean => {
    const matches = new RegExp(PROMPT_SCHEMA_REGEX).exec(sagemakerInputSchema);
    return matches !== null && matches?.length === 1;
};

export const InputSchema = (props: InputSchemaProps) => {
    const [value, setValue] = useState(defaultInputSchema(props.modelData.sagemakerInputSchema));
    const [preferences, setPreferences] = useState({});
    const [loading, setLoading] = useState(true);
    const [ace, setAce] = useState<any>();
    const [resizingHeight, setResizingHeight] = useState(200);
    const [inputSchemaError, setInputSchemaError] = useState('');
    const [inputSchemaErrorOnValidation, setInputSchemaErrorOnValidation] = useState('');
    const editorRef = useRef<any>();

    useEffect(() => {
        async function loadAce() {
            const ace = await import('ace-builds');
            await import('ace-builds/webpack-resolver');
            ace.config.set('useStrictCSP', true);

            ace.config.set('fontSize', '14px');
            ace.config.set('fontFamily', 'monospace');

            return ace;
        }

        loadAce()
            .then((ace) => setAce(ace))
            .finally(() => setLoading(false));

        props.onChangeFn({
            sagemakerInputSchema: value
        });
    }, []);

    const handleOnChange = (detail: CodeEditorProps.ChangeDetail) => {
        setValue(detail.value);
        props.onChangeFn({
            sagemakerInputSchema: detail.value
        });
    };

    const isModelParamsInTemplate = (): boolean => {
        try {
            const modelParamsJson = modelParamsToJson(props.modelData.modelParameters);
            return validateModelParamsInTemplate(props.modelData.sagemakerInputSchema, modelParamsJson);
        } catch (error) {
            return false;
        }
    };

    const validatePromptAndModelParams = () => {
        let errors = '';
        try {
            if (!isPromptTemplatePresentOnce(props.modelData.sagemakerInputSchema)) {
                errors += `Input schema must contain ${INPUT_SCHEMA_RESERVED_KEYS.prompt} exactly once. `;
            }

            if (!isModelParamsInTemplate()) {
                errors += `Input schema must only contain model parameters present in Advanced Model Parameters below. 
                Please ensure the model parameters are filled in correctly.`;
            }
            setInputSchemaError(errors);
        } catch (error) {
            errors = `Invalid InputSchema: ${error}`;
            setInputSchemaError(errors);
        }
    };

    const onValidateSchema = (detail: CodeEditorProps.ValidateDetail) => {
        if (detail.annotations && detail.annotations.length > 0) {
            const errors = formatValidationDetailToString(detail);
            setInputSchemaErrorOnValidation(errors);
        } else {
            setInputSchemaErrorOnValidation('');
        }
    };

    const setErrorText = () => {
        return [inputSchemaError, inputSchemaErrorOnValidation].join('');
    };

    useEffect(() => {
        const errText = setErrorText();
        props.onChangeFn({ inError: errText !== '' });
        if (errText !== '') {
            props.setNumFieldsInError((numFieldsInError: number) => numFieldsInError + 1);
        } else {
            props.setNumFieldsInError(0);
        }
    }, [inputSchemaErrorOnValidation, inputSchemaError]);

    useEffect(() => {
        validatePromptAndModelParams();
    }, [props.modelData.modelParameters, props.modelData.modelProvider, props.modelData.sagemakerInputSchema]);

    return (
        <FormField
            label={
                <span>
                    Input Payload Schema - <i>required</i>
                </span>
            }
            data-testid="sagemaker-input-payload-schema-field"
            description="SageMaker input schema is your model payload with placeholders for the model parameter values and the prompt."
            constraintText={`Parameter values supplied in Advanced Model Parameter section are represented in the SageMaker input schema by a placeholder value comprised of the key name wrapped inside "<<" and ">>". Preview is rendered to show your real model payload. ${INPUT_SCHEMA_RESERVED_KEYS.prompt} and ${INPUT_SCHEMA_RESERVED_KEYS.temperature} are reserved for prompt and temperature respectively.`}
            errorText={setErrorText()}
            info={<InfoLink onFollow={() => props.setHelpPanelContent!(modelToolsContent.sagemakerHelpPanel)} />}
        >
            <CodeEditor
                ref={editorRef}
                ace={ace}
                value={value}
                language="json"
                onDelayedChange={({ detail }) => handleOnChange(detail)}
                preferences={preferences}
                onPreferencesChange={(event) => setPreferences(event.detail)}
                loading={loading}
                i18nStrings={codeEditori18nStrings}
                editorContentHeight={resizingHeight}
                onEditorContentResize={(event) => setResizingHeight(event.detail.height)}
                themes={{ light: ['dawn'], dark: ['tomorrow_night_bright'] }}
                onValidate={({ detail }) => onValidateSchema(detail)}
            />
        </FormField>
    );
};

export default InputSchema;
