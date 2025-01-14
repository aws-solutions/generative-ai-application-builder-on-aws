// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import Link, { LinkProps } from '@cloudscape-design/components/link';

interface InfoLinkProps {
    id?: string;
    ariaLabel?: string;
    onFollow: LinkProps['onFollow'];
}
export const InfoLink = (props: InfoLinkProps) => (
    <Link variant="info" target="_blank" {...props}>
        Info
    </Link>
);
