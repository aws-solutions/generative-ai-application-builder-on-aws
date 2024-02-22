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
import { BaseFormComponentProps } from '../../../interfaces';
import { FormField, Input, InputProps } from '@cloudscape-design/components';
import { InfoLink } from '../../../../commons';
import { TOOLS_CONTENT } from '../../../tools-content';
import { updateNumFieldsInError } from '../../../utils';

const { knowledgeBase: knowledgeBaseToolsContent } = TOOLS_CONTENT;

interface KendraIndexIdProps extends BaseFormComponentProps {
    knowledgeBaseData: any;
}

export const KendraIndexId = (props: KendraIndexIdProps) => {
    const [kendraIndexIdError, setKendraIndexIdError] = React.useState('');

    const onKendraIndexIdChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ kendraIndexId: detail.value });
        let errors = '';
        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }
        if (!detail.value.match(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)) {
            errors += 'Does not match pattern of a valid Kendra index ID';
        }

        updateNumFieldsInError(errors, kendraIndexIdError, props.setNumFieldsInError);
        setKendraIndexIdError(errors);
    };

    return (
        <FormField
            label="Kendra index ID*"
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(knowledgeBaseToolsContent.kendraIndex)}
                    ariaLabel={'Information about the Kendra Index.'}
                />
            }
            description="Kendra index ID of an existing index in the AWS account."
            constraintText="A valid Kendra index ID must be provided. The index ID can be found in the Kendra console."
            errorText={kendraIndexIdError}
            data-testid="input-kendra-index-id"
        >
            <Input
                placeholder="Kendra index ID..."
                value={props.knowledgeBaseData.kendraIndexId}
                onChange={({ detail }) => onKendraIndexIdChange(detail)}
                autoComplete={false}
                data-testid="input-kendra-index-id-input"
            />
        </FormField>
    );
};

export default KendraIndexId;
