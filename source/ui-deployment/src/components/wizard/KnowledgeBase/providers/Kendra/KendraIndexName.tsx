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

import { FormField, Input, InputProps } from '@cloudscape-design/components';
import { MAX_KENDRA_IDX_NAME_LENGTH, MIN_KENDRA_IDX_NAME_LENGTH } from '../../../../../utils/constants';
import { BaseFormComponentProps } from '../../../interfaces';
import { updateNumFieldsInError } from '../../../utils';
import React from 'react';
import { InfoLink } from '../../../../commons';
import { TOOLS_CONTENT } from '../../../tools-content';

const { knowledgeBase: knowledgeBaseToolsContent } = TOOLS_CONTENT;

interface KendraIndexNameProps extends BaseFormComponentProps {
    knowledgeBaseData: any;
}

export const KendraIndexName = (props: KendraIndexNameProps) => {
    const [kendraIndexNameError, setKendraIndexNameError] = React.useState('');

    const onKendraIndexNameChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ kendraIndexName: detail.value });
        let errors = '';

        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }

        if (!detail.value.match(`^[0-9a-zA-Z-]{${MIN_KENDRA_IDX_NAME_LENGTH},${MAX_KENDRA_IDX_NAME_LENGTH}}$`)) {
            errors +=
                'Can only include alphanumeric characters and hyphens and must be between ' +
                MIN_KENDRA_IDX_NAME_LENGTH +
                ' and ' +
                MAX_KENDRA_IDX_NAME_LENGTH +
                ' characters. ';
        }

        updateNumFieldsInError(errors, kendraIndexNameError, props.setNumFieldsInError);
        setKendraIndexNameError(errors);
    };

    React.useEffect(() => {
        if (props.knowledgeBaseData.kendraIndexName === '') {
            props.onChangeFn({ inError: true });
        }
    }, [props.knowledgeBaseData.kendraIndexName]);

    return (
        <FormField
            label={
                <span>
                    Kendra index name - <i>required</i>
                </span>
            }
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(knowledgeBaseToolsContent.kendraIndex)}
                    ariaLabel={'Information about the Kendra Index.'}
                />
            }
            description="Name of the Kendra index to be created."
            constraintText="Index name must be unique within the account."
            errorText={kendraIndexNameError}
            data-testid="input-kendra-index-name"
        >
            <Input
                placeholder="Kendra index name..."
                value={props.knowledgeBaseData.kendraIndexName}
                onChange={({ detail }) => onKendraIndexNameChange(detail)}
                autoComplete={false}
            />
        </FormField>
    );
};
export default KendraIndexName;
