// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, FormField, Input, InputProps } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../interfaces';
import { updateNumFieldsInError } from '../../utils';
import { InfoLink } from '@/components/commons';
import { IG_DOCS } from '@/utils/constants';

export interface OutputSchemaProps extends BaseFormComponentProps {
    modelData: any;
}

export const OutputPathSchema = (props: OutputSchemaProps) => {
    const [outputPathSchemaError, setOutputPathSchemaError] = React.useState('');

    const onOutputPathSchemaChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ sagemakerOutputSchema: detail.value });
        let errors = '';

        if (!detail.value.match('^\\$[\\w\\.\\,\\[\\]:\\\'\\"\\-\\(\\)\\*\\?\\@]*$')) {
            errors = 'Must be a valid JSONPath expression starting with "$"';
        }

        updateNumFieldsInError(errors, outputPathSchemaError, props.setNumFieldsInError);
        setOutputPathSchemaError(errors);
    };

    return (
        <FormField
            label={
                <span>
                    Output path <i>- required</i>{' '}
                </span>
            }
            errorText={outputPathSchemaError}
            data-testid="output-path-schema-field"
            description="JSONPath expression that evaluates to the location of the generated text from the model's output response."
            info={<InfoLink onFollow={() => props.setHelpPanelContent!(sagemakerOutputPathInfoPanel)} />}
        >
            <Input
                placeholder="$[0].generatedText"
                value={props.modelData.sagemakerOutputSchema}
                onChange={({ detail }) => onOutputPathSchemaChange(detail)}
                autoComplete={false}
            />
        </FormField>
    );
};

export default OutputPathSchema;

//INFO PANEL CONTENT
const sagemakerOutputPathInfoPanel = {
    title: 'Output Path',
    content: (
        <Box variant="p">
            The location of the LLMs generated string response within the output payload. This must be supplied as a
            JSONPath expression to indicate where the final text response shown to users is expected to be accessed from
            within the endpoint's return object/response.
        </Box>
    ),
    links: [
        {
            href: IG_DOCS.SAGEMAKER_USE,
            text: 'Using a SageMaker Endpoint'
        }
    ]
};
