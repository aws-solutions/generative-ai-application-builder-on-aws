// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { BaseFormComponentProps } from '../../../interfaces';
import { FormField, Input, InputProps } from '@cloudscape-design/components';
import { InfoLink } from '../../../../commons';
import { updateNumFieldsInError } from '../../../utils';
import { knowledgeBaseInfoPanel } from '../../helpers';

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
            label={
                <span>
                    Kendra Index ID - <i>required</i>
                </span>
            }
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(knowledgeBaseInfoPanel.kendraIndex)}
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
