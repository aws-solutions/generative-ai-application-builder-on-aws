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
