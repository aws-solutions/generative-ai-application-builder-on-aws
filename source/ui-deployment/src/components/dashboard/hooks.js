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

import { useEffect, useState } from 'react';
import { fetchDeployments } from './deployments';

export function useDeployments(params = {}) {
    const { pageSize, currentPageIndex: clientPageIndex } = params.pagination || {};
    const { sortingDescending, sortingColumn } = params.sorting || {};
    const { filteringText, filteringTokens, filteringOperation } = params.filtering || {};
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPageIndex, setCurrentPageIndex] = useState(clientPageIndex);
    const [pagesCount, setPagesCount] = useState(0);

    useEffect(() => {
        setCurrentPageIndex(clientPageIndex);
    }, [clientPageIndex]);

    useEffect(() => {
        setLoading(true);
        const params = {
            filteringText,
            filteringTokens,
            filteringOperation,
            pageSize,
            currentPageIndex,
            sortingDescending,
            ...(sortingColumn
                ? {
                      sortingColumn: sortingColumn.sortingField
                  }
                : {})
        };
        const callback = ({ items, pagesCount, currentPageIndex }) => {
            setLoading(false);
            setItems(items);
            setPagesCount(pagesCount + 1);
            setCurrentPageIndex(currentPageIndex);
            if (totalCount === 0) {
                setTotalCount(pagesCount > 1 ? pageSize * (pagesCount - 1) : items.length);
            }
        };
        fetchDeployments(params, callback);
    }, [
        pageSize,
        sortingDescending,
        sortingColumn,
        currentPageIndex,
        filteringText,
        filteringTokens,
        filteringOperation
    ]);

    return {
        items,
        loading,
        totalCount,
        pagesCount,
        currentPageIndex
    };
}
