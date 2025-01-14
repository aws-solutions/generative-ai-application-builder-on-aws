// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { FormField, Select, SelectProps } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../../interfaces';
import { InfoLink } from '../../../../commons';
import { KENDRA_EDITIONS } from '../../../steps-config';
import { knowledgeBaseInfoPanel } from '../../helpers';

interface KendraEditionProps extends BaseFormComponentProps {
    knowledgeBaseData: any;
}

export const KendraEdition = (props: KendraEditionProps) => {
    const onKendraEditionChange = (detail: SelectProps.ChangeDetail) => {
        props.onChangeFn({ kendraEdition: detail.selectedOption });
    };

    return (
        <FormField
            label="Kendra edition"
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(knowledgeBaseInfoPanel.kendraAdditionalQueryCapacity)}
                    ariaLabel={'Information about Kendra editions.'}
                />
            }
            data-testid="kendra-edition"
        >
            <Select
                options={KENDRA_EDITIONS}
                onChange={({ detail }) => onKendraEditionChange(detail)}
                selectedAriaLabel="Selected"
                selectedOption={props.knowledgeBaseData.kendraEdition}
                data-testid="kendra-edition-select"
            />
        </FormField>
    );
};

export default KendraEdition;
