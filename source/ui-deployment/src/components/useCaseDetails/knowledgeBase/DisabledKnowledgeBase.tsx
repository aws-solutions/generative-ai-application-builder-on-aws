// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ColumnLayout, StatusIndicator, SpaceBetween } from '@cloudscape-design/components';
import { ValueWithLabel } from '../../../utils/ValueWithLabel';

export const DisabledKnowledgeBase = () => {
    return (
        <ColumnLayout columns={2} variant="text-grid" data-testid="kb-disabled-tab">
            <SpaceBetween size="l">
                <ValueWithLabel label={'Retrieval Augmented Generation (RAG) Enabled'}>
                    <StatusIndicator type={'warning'}>disabled</StatusIndicator>
                </ValueWithLabel>
            </SpaceBetween>
        </ColumnLayout>
    );
};
