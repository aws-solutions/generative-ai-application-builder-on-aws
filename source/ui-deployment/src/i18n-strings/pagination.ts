// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { PaginationProps, TableProps } from '@cloudscape-design/components';

export const renderAriaLive: TableProps['renderAriaLive'] = ({ firstIndex, lastIndex, totalItemsCount }) =>
    `Displaying items ${firstIndex} to ${lastIndex} of ${totalItemsCount}`;

export const paginationAriaLabels: (totalPages?: number) => PaginationProps.Labels = (totalPages) => ({
    nextPageLabel: 'Next page',
    previousPageLabel: 'Previous page',
    pageLabel: (pageNumber) => `Page ${pageNumber} of ${totalPages || 'all pages'}`
});
