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

import { FormField, Select, SelectProps } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../../interfaces';
import { TOOLS_CONTENT } from '../../../tools-content';
import { InfoLink } from '../../../../commons';
import { KENDRA_EDITIONS } from '../../../steps-config';

const { knowledgeBase: knowledgeBaseToolsContent } = TOOLS_CONTENT;

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
                    onFollow={() => props.setHelpPanelContent!(knowledgeBaseToolsContent.kendraAdditionalQueryCapacity)}
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
