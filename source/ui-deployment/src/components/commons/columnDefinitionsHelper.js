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

export const addToColumnDefinitions = (columnDefinitions, propertyName, columns) =>
    columnDefinitions.map((colDef) => {
        const column = (columns || []).find((col) => col.id === colDef.id);
        return {
            ...colDef,
            [propertyName]: (column && column[propertyName]) || colDef[propertyName]
        };
    });

export const mapWithColumnDefinitionIds = (columnDefinitions, propertyName, items) =>
    columnDefinitions.map(({ id }, i) => ({
        id,
        [propertyName]: items[i]
    }));
