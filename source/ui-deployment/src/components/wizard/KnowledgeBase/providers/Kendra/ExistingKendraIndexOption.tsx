// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { FormField, RadioGroup, RadioGroupProps } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../../interfaces';
import { InfoLink } from '../../../../commons';
import { knowledgeBaseInfoPanel } from '../../helpers';

interface ExistingKendraIndexProps extends BaseFormComponentProps {
    knowledgeBaseData: any;
}

export const ExistingKendraIndexOption = (props: ExistingKendraIndexProps) => {
    const onExistingKendraIndexChange = (detail: RadioGroupProps.ChangeDetail) => {
        props.onChangeFn({
            existingKendraIndex: detail.value
        });
    };

    return (
        <FormField
            label={
                <span>
                    Do you have an existing Kendra index? - <i>required</i>
                </span>
            }
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(knowledgeBaseInfoPanel.kendraIndex)}
                    ariaLabel={'Information about having a Kendra Index.'}
                />
            }
            stretch={true}
            data-testid="existing-kendra-index-select"
        >
            <RadioGroup
                onChange={({ detail }) => onExistingKendraIndexChange(detail)}
                items={[
                    {
                        value: 'Yes',
                        label: 'Yes'
                    },
                    {
                        value: 'No',
                        label: 'No',
                        description: 'It will be created for you.'
                    }
                ]}
                value={props.knowledgeBaseData.existingKendraIndex}
                data-testid="existing-kendra-index-radio-group"
            />
        </FormField>
    );
};

export default ExistingKendraIndexOption;
