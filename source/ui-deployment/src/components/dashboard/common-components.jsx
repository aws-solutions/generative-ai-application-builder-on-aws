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

import { Box, BreadcrumbGroup, HelpPanel, Icon, SpaceBetween } from '@cloudscape-design/components';
import { resourcesBreadcrumbs } from '../commons/breadcrumbs';
import { ExternalLinkGroup } from '../commons';
import { LANDING_PAGE_URL } from '../../utils/constants';

export const Breadcrumbs = () => (
    <BreadcrumbGroup items={resourcesBreadcrumbs} expandAriaLabel="Show path" ariaLabel="Breadcrumbs" />
);
export const ToolsContent = () => (
    <HelpPanel
        header={<h2>Deployments</h2>}
        footer={
            <ExternalLinkGroup
                items={[
                    {
                        href: LANDING_PAGE_URL,
                        text: 'Solution Landing Page'
                    }
                ]}
            />
        }
    >
        <SpaceBetween size="s">
            <Box variant="p">
                Generative AI Application Builder on AWS is an AWS Solution that allows you to deploy customizable Gen
                AI use cases from this dashboard. This Deployment Dashboard allows you to deploy, experiment with, and
                compare different combinations of Large Language Model (LLM) use-cases.
            </Box>
            <Box variant="p">
                This page provides a high level summary of your deployments and enables you to create new deployments,
                as well as search and filter through existing ones. Use this page to manage your deployments in a single
                place.
            </Box>
            <Box variant="h4">Deploy new use case</Box>
            <Box variant="p">
                By selecting <b>Deploy new use case</b>, you will launch a wizard guiding you through the steps required
                to configure and deploy a new use case. You may need to contact your Account Administrator for help with
                certain configurations.
            </Box>
            <Box variant="h4">Refresh Deployments</Box>
            <Box variant="p">
                By selecting the refresh icon (<Icon name="refresh" />
                ), the latest information will be pulled into the table to give you the most up to date status details.
            </Box>
            <Box variant="h4">View Details</Box>
            <Box variant="p">
                By selecting a deployment, you can click <b>View Details</b> to dig further into it viewing all the
                configuration details of that use case.
            </Box>
            <Box variant="h4">Edit</Box>
            <Box variant="p">
                By selecting a deployment, you can click <b>Edit</b> to launch the wizard. Only select fields can be
                edited on an existing deployment. The deployment must be in the <b>CREATE_COMPLETE</b> or{' '}
                <b>UPDATE_COMPLETE</b> state to perform an edit.
            </Box>
            <Box variant="h4">Clone</Box>
            <Box variant="p">
                By selecting a deployment, you can click <b>Clone</b> to launch a pre-filled version of the{' '}
                <b>Deploy new use case</b> wizard. Use this to quickly create a new deployment based off of a similar
                configuration.
            </Box>
            <Box variant="h4">Delete</Box>
            <Box variant="p">
                By selecting a deployment, you can click <b>Delete</b> to initiate the deletion of the deployment. A
                deleted deployment will remain in the table to allow cloning from its configuration. To completely
                remove the record, you must select <i>permanently delete</i> in the pop-up confirmation window.
            </Box>
        </SpaceBetween>
    </HelpPanel>
);
