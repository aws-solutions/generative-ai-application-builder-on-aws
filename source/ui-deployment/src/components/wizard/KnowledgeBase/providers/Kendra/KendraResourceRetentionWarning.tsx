// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Alert, Box, FormField } from '@cloudscape-design/components';
import { KENDRA_WARNING } from '../../../../../utils/constants';

export const KendraResourceRetentionWarning = () => {
    return (
        <FormField>
            <Alert statusIconAriaLabel="warning" type="warning" data-testid="kendra-resource-retention-alert">
                <Box variant="p">{KENDRA_WARNING}</Box>
            </Alert>
        </FormField>
    );
};

export default KendraResourceRetentionWarning;
