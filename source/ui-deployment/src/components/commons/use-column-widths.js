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

import { useMemo } from 'react';
import { addToColumnDefinitions, mapWithColumnDefinitionIds } from './columnDefinitionsHelper';
import { useLocalStorage } from './use-local-storage';

export function useColumnWidths(storageKey, columnDefinitions) {
    const [widths, saveWidths] = useLocalStorage(storageKey);

    function handleWidthChange(event) {
        saveWidths(mapWithColumnDefinitionIds(columnDefinitions, 'width', event.detail.widths));
    }
    const memoDefinitions = useMemo(() => {
        return addToColumnDefinitions(columnDefinitions, 'width', widths);
    }, [widths, columnDefinitions]);

    return [memoDefinitions, handleWidthChange];
}
