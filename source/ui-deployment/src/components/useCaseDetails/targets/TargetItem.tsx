// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Badge, ColumnLayout, Container, Header } from '@cloudscape-design/components';
import { ValueWithLabel } from '../../../utils/ValueWithLabel';

interface TargetItemProps {
    target: any;
    index: number;
}

export const TargetItem = ({ target, index }: TargetItemProps) => {
    return (
        <Container
            header={<Header variant="h3">{target.TargetName || `Target ${index + 1}`}</Header>}
            data-testid={`target-item-${index}`}
        >
            <ColumnLayout columns={2} variant="text-grid">
                <ValueWithLabel label="Target Id">{target.TargetId || "" }</ValueWithLabel>
                <ValueWithLabel label="Target Type">
                    <Badge color="blue">{target.TargetType || 'Unknown'}</Badge>
                </ValueWithLabel>
                <ValueWithLabel label="Description">{target.TargetDescription || '-'}</ValueWithLabel>
            </ColumnLayout>
        </Container>
    );
};
