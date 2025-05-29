// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Header, SpaceBetween } from '@cloudscape-design/components';

export interface PageHeaderProps {
    buttonsList: React.ReactNode[];
    deploymentId: string;
}

/**
 * A component that renders a page header with a title and optional action buttons
 * @param {Object} props - The component props
 * @param {React.ReactNode[]} props.buttonsList - Array of button elements to display in the header
 * @param {string} props.deploymentId - Deployment ID string that will be split to display the first part as the header title
 * @returns {JSX.Element} Header component with title and action buttons
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ buttonsList, deploymentId }) => {
    return (
        <Header
            variant="h1"
            actions={
                <SpaceBetween direction="horizontal" size="xs">
                    {buttonsList.length > 0 && buttonsList.map((button) => button)}
                </SpaceBetween>
            }
        >
            {deploymentId.split('/')[0]}
        </Header>
    );
};
