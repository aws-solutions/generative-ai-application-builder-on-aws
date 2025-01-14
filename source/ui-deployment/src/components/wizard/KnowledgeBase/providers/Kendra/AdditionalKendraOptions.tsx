// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, ExpandableSection, SpaceBetween } from '@cloudscape-design/components';
import { KnowledgeBaseConfigProps } from '../../../interfaces/Steps';
import { KendraEdition } from './KendraEdition';
import { KendraQueryCapacity } from './KendraQueryCapacity';
import { KendraStorageCapacity } from './KendraStorageCapacity';

type AdditionalKendraOptionsProps = KnowledgeBaseConfigProps;

export const AdditionalKendraOptions = (props: AdditionalKendraOptionsProps) => {
    return (
        <Box data-testid="additional-kendra-options">
            <ExpandableSection headerText="Additional Kendra options" variant="footer">
                <SpaceBetween size="l">
                    <KendraEdition {...props} />
                    <KendraQueryCapacity {...props} />
                    <KendraStorageCapacity {...props} />
                </SpaceBetween>
            </ExpandableSection>
        </Box>
    );
};

export default AdditionalKendraOptions;
