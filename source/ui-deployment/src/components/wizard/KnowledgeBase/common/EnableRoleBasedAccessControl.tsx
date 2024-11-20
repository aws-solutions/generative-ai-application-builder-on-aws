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

import { Box, FormField, RadioGroup, RadioGroupProps } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../interfaces';
import { InfoLink } from '../../../commons';
import { IG_DOCS } from '@/utils/constants';
import { getBooleanString } from '../../utils';

interface EnableRoleBasedAccessControlProps extends BaseFormComponentProps {
    knowledgeBaseData: any;
}

export const EnableRoleBasedAccessControl = (props: EnableRoleBasedAccessControlProps) => {
    const onEnableRoleBasedAccessControl = (detail: RadioGroupProps.ChangeDetail) => {
        const enableRoleBasedAccessControl = detail.value === 'Yes';
        props.onChangeFn({ 'enableRoleBasedAccessControl': enableRoleBasedAccessControl });
    };
    const warningText = 'Ensure the Knowledge Base is configured to support role-based access control.';

    return (
        <FormField
            label="Role based access control enabled?"
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(enabledRoleBasedAccessControlInfoPanel)}
                    ariaLabel={'Information about enabling role-based access control'}
                />
            }
            description="If enabled, the user's credentials will be used to filter search results, restricting access to documents based on their role and group permissions."
            data-testid="enable-role-based-access-control-field"
            warningText={props.knowledgeBaseData.enableRoleBasedAccessControl ? warningText : ''}
        >
            <RadioGroup
                onChange={({ detail }) => onEnableRoleBasedAccessControl(detail)}
                items={[
                    {
                        value: 'Yes',
                        label: 'Yes'
                    },
                    {
                        value: 'No',
                        label: 'No'
                    }
                ]}
                value={getBooleanString(props.knowledgeBaseData.enableRoleBasedAccessControl)}
                data-testid="enable-role-based-access-control-radio-group"
            />
        </FormField>
    );
};

const enabledRoleBasedAccessControlInfoPanel = {
    title: 'Enable role based access control',
    content: (
        <div>
            <Box variant="p">
                If enabled, only documents a user of the chat application has the permissions to view will be used as a
                reference for RAG by the LLM to generate responses
            </Box>
        </div>
    ),
    links: [
        {
            text: 'Configuring role-based access control with Amazon Kendra',
            href: IG_DOCS.RBAC_RAG_KENDRA
        },
        {
            href: 'https://aws.amazon.com/blogs/security/use-aws-lambda-authorizers-with-a-third-party-identity-provider-to-secure-amazon-api-gateway-rest-apis/',
            text: 'Further related reading'
        }
    ]
};

export default EnableRoleBasedAccessControl;
