// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import Icon from '@cloudscape-design/components/icon';
import Link from '@cloudscape-design/components/link';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import { SeparatedList } from './separated-list';
import { useComponentId } from './use-component-id';

interface ExternalLinkItemProps {
    href: string;
    text: string;
}

interface ExternalLinkGroupProps {
    variant?: 'default' | 'container';
    header?: string;
    groupAriaLabel?: string;
    items: Array<ExternalLinkItemProps>;
}

const labelSuffix = 'Opens in a new tab';

function ExternalLinkItem({ href, text }: ExternalLinkItemProps) {
    return (
        <Link href={href} ariaLabel={`${text} ${labelSuffix}`} target="_blank">
            {text}
        </Link>
    );
}

export function ExternalLinkGroup({
    header = 'Learn more',
    groupAriaLabel,
    items,
    variant = 'default'
}: ExternalLinkGroupProps) {
    const externalIcon = (
        <span role="img" aria-label="Icon external Link">
            <Icon name="external" size="inherit" />
        </span>
    );

    const componentId = useComponentId();

    if (variant === 'container') {
        return (
            <Container
                header={
                    <Header>
                        {header} {externalIcon}
                    </Header>
                }
            >
                <SeparatedList
                    ariaLabel={groupAriaLabel}
                    items={items.map((item, index) => (
                        <ExternalLinkItem key={`${componentId}.${index}`} href={item.href} text={item.text} /> //NOSONAR - using unique componentId to prevent rerenders
                    ))}
                />
            </Container>
        );
    }

    return (
        <>
            <h3>
                {header} {externalIcon}
            </h3>
            <ul aria-label={groupAriaLabel}>
                {items.map(
                    (item, index) =>
                        // prettier-ignore
                        <li key={`${componentId}.${index}`}><ExternalLinkItem href={item.href} text={item.text} /></li> //NOSONAR - using unique componentId to prevent rerenders
                )}
            </ul>
        </>
    );
}
