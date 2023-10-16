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
 **********************************************************************************************************************/

import { PaginationProps, TableProps } from '@cloudscape-design/components';

export const renderAriaLive: TableProps['renderAriaLive'] = ({ firstIndex, lastIndex, totalItemsCount }) =>
    `Displaying items ${firstIndex} to ${lastIndex} of ${totalItemsCount}`;

export const paginationAriaLabels: (totalPages?: number) => PaginationProps.Labels = (totalPages) => ({
    nextPageLabel: 'Next page',
    previousPageLabel: 'Previous page',
    pageLabel: (pageNumber) => `Page ${pageNumber} of ${totalPages || 'all pages'}`
});
