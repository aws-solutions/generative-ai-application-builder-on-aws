// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { useComponentId } from './use-component-id';

interface SeparatedListProps {
    ariaLabel?: string;
    items: Array<React.ReactNode>;
}

export function SeparatedList({ ariaLabel, items }: SeparatedListProps) {
    const componentId = useComponentId();
    return (
        <ul aria-label={ariaLabel}>
            {items.map((item, index) => (
                <li key={`${componentId}.${index}`}>{item}</li> //NOSONAR - using unique componentId to prevent rerenders
            ))}
        </ul>
    );
}
