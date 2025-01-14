// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { forwardRef } from 'react';
import { AppLayout, Box, Button, SpaceBetween } from '@cloudscape-design/components';
import { appLayoutAriaLabels } from '../../i18n-strings';

// backward compatibility
export * from './index';

export const CustomAppLayout = forwardRef((props, ref) => {
    return <AppLayout ref={ref} ariaLabels={appLayoutAriaLabels} {...props} />;
});

export const TableEmptyState = ({ resourceName }) => (
    <Box margin={{ vertical: 'xs' }} textAlign="center" color="inherit">
        <SpaceBetween size="xxs">
            <div>
                <b>No {resourceName.toLowerCase()}s</b>
                <Box variant="p" color="inherit">
                    No {resourceName.toLowerCase()}s found.
                </Box>
            </div>
            <Button>Create {resourceName.toLowerCase()}</Button>
        </SpaceBetween>
    </Box>
);

export const TableNoMatchState = (props) => (
    <Box margin={{ vertical: 'xs' }} textAlign="center" color="inherit">
        <SpaceBetween size="xxs">
            <div>
                <b>No matches</b>
                <Box variant="p" color="inherit">
                    We can't find a match.
                </Box>
            </div>
            <Button onClick={props.onClearFilter}>Clear filter</Button>
        </SpaceBetween>
    </Box>
);
