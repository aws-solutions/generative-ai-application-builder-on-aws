// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState, useRef, ReactNode } from 'react';
import { KnowledgeBaseConfigProps } from '@/components/wizard/interfaces/Steps';
import { loadAce, updateNumFieldsInError } from '../../utils';
import { CodeEditor, CodeEditorProps, FormField } from '@cloudscape-design/components';

export interface QueryFilterInfoPanelProps extends KnowledgeBaseConfigProps {
    label: ReactNode;
    description: ReactNode;
    'data-testid': string;
    infoLinkContent: JSX.Element;
}

export const QueryFilterJsonEditor = (props: QueryFilterInfoPanelProps) => {
    const [queryFilterValue, setQueryFilterValue] = useState(props.knowledgeBaseData.queryFilter);
    const [ace, setAce] = useState<any>();
    const [loading, setLoading] = useState(true);
    const [errorText, setErrorText] = useState('');
    const editorRef = useRef<any>();
    const [preferences, setPreferences] = useState({});
    const [resizingHeight, setResizingHeight] = useState(200);

    useEffect(() => {
        loadAce()
            .then((ace) => setAce(ace))
            .finally(() => setLoading(false));

        props.onChangeFn({
            queryFilter: queryFilterValue
        });
    }, []);

    const handleOnChange = (detail: CodeEditorProps.ChangeDetail) => {
        setQueryFilterValue(detail.value);
        props.onChangeFn({
            queryFilter: detail.value
        });
    };

    const onValidateSchema = (detail: CodeEditorProps.ValidateDetail) => {
        let errors = '';
        if (detail.annotations && detail.annotations.length > 0) {
            errors = formatValidationDetailToString(detail);
        }

        setErrorText(errors);
        updateNumFieldsInError(errors, errorText, props.setNumFieldsInError);
    };

    return (
        <FormField
            label={props.label}
            info={props.infoLinkContent}
            data-testid={props['data-testid']}
            description={props.description}
            errorText={errorText}
        >
            <CodeEditor
                ref={editorRef}
                ace={ace}
                value={queryFilterValue}
                language="json"
                onDelayedChange={({ detail }) => handleOnChange(detail)}
                preferences={preferences}
                onPreferencesChange={(event) => setPreferences(event.detail)}
                loading={loading}
                editorContentHeight={resizingHeight}
                onEditorContentResize={(event) => setResizingHeight(event.detail.height)}
                themes={{ light: ['dawn'], dark: ['tomorrow_night_bright'] }}
                onValidate={({ detail }) => onValidateSchema(detail)}
            />
        </FormField>
    );
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

export default QueryFilterJsonEditor;
