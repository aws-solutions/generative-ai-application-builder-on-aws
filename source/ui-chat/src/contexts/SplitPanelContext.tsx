// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { createContext, ReactNode, lazy, Suspense } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { setSettingsPanelOpen } from '../store/preferencesSlice';
import { selectUseCaseType } from '../store/configSlice';
import { USE_CASE_TYPES } from '../utils/constants';

/**
 * Type definition for the split panel context.
 * @property header - The title text displayed in the panel header
 * @property content - The React node content to be rendered in the panel
 * @property isOpen - Boolean indicating if the panel is currently open
 * @property onClose - Callback function triggered when closing the panel
 * @property isSettingsEnabled - Boolean indicating if settings functionality is enabled
 */
export type SplitPanelContextType = {
    header: string;
    content: ReactNode;
    isOpen: boolean;
    onClose: () => void;
    isSettingsEnabled: boolean;
};

/**
 * Default state values for the split panel
 */
const DEFAULT_STATE = {
    header: 'Settings',
    content: null, // Will be set dynamically in the provider
    isOpen: true,
    onClose: () => {},
    isSettingsEnabled: true
};

/**
 * React context for managing split panel state and updates
 */
export const SplitPanelContext = createContext<{
    splitPanelState: SplitPanelContextType;
    setSplitPanelState: (
        value: ((prevState: SplitPanelContextType) => SplitPanelContextType) | SplitPanelContextType
    ) => void;
}>(null as any);

/**
 * Provider component for the split panel context
 * Manages panel state and provides update methods to children
 * @param props.children - Child components that will have access to the context
 */
export const SplitPanelContextProvider = (props: { children: ReactNode }) => {
    const dispatch = useDispatch();
    const isOpen = useSelector((state: RootState) => state.preferences.settingsPanelOpen);
    const useCaseType = useSelector((state: RootState) => selectUseCaseType(state));
    
    // Dynamically import the SplitPanelSettings component
    const SplitPanelSettings = lazy(() => import('../pages/chat/components/settings/SplitPanelSettings').then(
        module => ({ default: module.SplitPanelSettings })
    ));
    
    const splitPanelState: SplitPanelContextType = {
        header: DEFAULT_STATE.header,
        content: <SplitPanelSettings />,
        isOpen,
        onClose: () => dispatch(setSettingsPanelOpen(false)),
        // TODO: fix isSettingsEnabled to allow for toggle icon
        isSettingsEnabled: useCaseType !== USE_CASE_TYPES.AGENT
    };
    /**
     * Updates the split panel state and dispatches changes to Redux store
     * @param value - New state object or function that returns new state
     */
    const setSplitPanelState = (
        value: SplitPanelContextType | ((prev: SplitPanelContextType) => SplitPanelContextType)
    ) => {
        const newState = typeof value === 'function' ? value(splitPanelState) : value;
        dispatch(setSettingsPanelOpen(newState.isOpen));
    };

    return (
        <>
            <SplitPanelContext.Provider value={{ splitPanelState, setSplitPanelState }}>
                <Suspense fallback={<div>Loading...</div>}>
                    {props.children}
                </Suspense>
            </SplitPanelContext.Provider>
        </>
    );
};
