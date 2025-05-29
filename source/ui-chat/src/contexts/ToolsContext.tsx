// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createContext, ReactNode, useState } from 'react';

export type ToolsContextType = {
    helpTopic: string | null;
    toolsOpen: boolean;
    setToolsOpen: (open: boolean) => void;
};

const DEFAULT_STATE = {
    helpTopic: null,
    toolsOpen: false,
    setToolsOpen: (_open: boolean) => {}
};
export const ToolsContext = createContext<{
    toolsState: ToolsContextType;
    setToolsState: (value: ((prevState: ToolsContextType) => ToolsContextType) | ToolsContextType) => void;
}>(null as any);
export const ToolsContextProvider = (props: { children: ReactNode }) => {
    const [toolsState, setToolsState] = useState<ToolsContextType>(DEFAULT_STATE);

    return (
        <>
            <ToolsContext.Provider value={{ toolsState, setToolsState }}>{props.children}</ToolsContext.Provider>
        </>
    );
};
