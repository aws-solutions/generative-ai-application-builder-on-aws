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

import { FormField, RadioGroup, RadioGroupProps } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../../interfaces';
import { InfoLink } from '../../../../commons';
import { TOOLS_CONTENT } from '../../../tools-content';

const { knowledgeBase: knowledgeBaseToolsContent } = TOOLS_CONTENT;

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
                    onFollow={() => props.setHelpPanelContent!(knowledgeBaseToolsContent.kendraIndex)}
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
                        value: 'yes',
                        label: 'Yes'
                    },
                    {
                        value: 'no',
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
