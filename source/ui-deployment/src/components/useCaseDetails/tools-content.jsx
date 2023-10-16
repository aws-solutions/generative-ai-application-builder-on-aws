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
 *********************************************************************************************************************/

import { Box, HelpPanel, SpaceBetween } from '@cloudscape-design/components';
import { ExternalLinkGroup } from '../commons';
import { IG_DOCS } from '../../utils/constants';

export const ToolsContent = () => (
    <HelpPanel
        header={<h2>Deployment Details</h2>}
        footer={
            <ExternalLinkGroup
                items={[
                    {
                        href: IG_DOCS.USING_THE_SOLUTION,
                        text: 'Using the solution'
                    }
                ]}
            />
        }
    >
        <SpaceBetween size="s">
            <Box variant="p">
                This page displays the details of your deployment. You can also use this page to navigate to the
                deployed application, as well as relevant resources on the AWS Console.
            </Box>

            <Box variant="h4">Model</Box>
            <Box variant="p">
                This section shows information about the model that is being used by this deployment. It also shows the
                current system prompt that is in use.
            </Box>
            <Box variant="h4">Knowledge Base</Box>
            <Box variant="p">
                This section shows information about the knowledge base that is being used by this deployment (if
                applicable).
            </Box>
        </SpaceBetween>
    </HelpPanel>
);
