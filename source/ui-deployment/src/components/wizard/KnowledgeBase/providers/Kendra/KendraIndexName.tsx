// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { FormField, Input, InputProps } from '@cloudscape-design/components';
import { MAX_KENDRA_IDX_NAME_LENGTH, MIN_KENDRA_IDX_NAME_LENGTH } from '../../../../../utils/constants';
import { BaseFormComponentProps } from '../../../interfaces';
import { updateNumFieldsInError } from '../../../utils';
import React from 'react';
import { InfoLink } from '../../../../commons';
import { knowledgeBaseInfoPanel } from '../../helpers';

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
                    onFollow={() => props.setHelpPanelContent!(knowledgeBaseInfoPanel.kendraIndex)}
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
