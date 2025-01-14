// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const save = (key: string, value: any) => localStorage.setItem(key, JSON.stringify(value));

export const remove = (key: string) => localStorage.removeItem(key);

export const load = (key: string) => {
    const value = localStorage.getItem(key);
    try {
        return value && JSON.parse(value);
    } catch (e) {
        console.warn(
            `⚠️ The ${key} value that is stored in localStorage is incorrect. Try to remove the value ${key} from localStorage and reload the page`
        );
        return undefined;
    }
};
