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

import React from 'react';
import { FormField, Input, InputProps } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../interfaces';
import { updateNumFieldsInError } from '../../utils';
import { InfoLink } from 'components/commons';
import { modelToolsContent } from '../helpers';

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
            info={<InfoLink onFollow={() => props.setHelpPanelContent!(modelToolsContent.sagemakerHelpPanel)} />}
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
