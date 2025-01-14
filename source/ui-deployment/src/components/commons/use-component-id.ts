// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

export function useSingleton<T>(provider: () => T): T {
    const singleton = useRef<T>();

    function getSingleton() {
        if (singleton.current == null) {
            singleton.current = provider();
        }
        return singleton.current;
    }

    return getSingleton();
}

export function useComponentId(): string {
    return useSingleton(uuidv4);
}
