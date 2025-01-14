// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
