// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, HelpPanel, SpaceBetween } from '@cloudscape-design/components';
import { ExternalLinkGroup } from '../components/commons';
import { IG_DOCS, USECASE_TYPES } from './constants';

export const ToolsContent = ({ useCaseType }) => (
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

            {useCaseType === USECASE_TYPES.AGENT ? (
                <>
                    <Box variant="h4">Agent</Box>
                    <Box variant="p">
                        This section shows information about the agent that is being used by this deployment.
                    </Box>
                </>
            ) : (
                <>
                    <Box variant="h4">Model</Box>
                    <Box variant="p">
                        This section shows information about the model that is being used by this deployment.
                    </Box>
                    <Box variant="h4">Knowledge Base</Box>
                    <Box variant="p">
                        This section shows information about the knowledge base that is being used by this deployment
                        (if applicable).
                    </Box>
                    <Box variant="h4">Prompt</Box>
                    <Box variant="p">
                        This section shows information about the prompt related settings used by this deployment.
                    </Box>
                </>
            )}
        </SpaceBetween>
    </HelpPanel>
);
