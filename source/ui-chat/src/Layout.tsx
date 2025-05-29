// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useContext } from 'react';
import { AppLayout, Flashbar, SplitPanel } from '@cloudscape-design/components';
import SideNavigationBar from './components/navigation/SideNavigationBar.tsx';
import { NotificationContext } from './contexts/NotificationContext.tsx';
import { ToolsContext, ToolsContextType } from './contexts/ToolsContext.tsx';
import { SplitPanelContext } from './contexts/SplitPanelContext.tsx';
import { Outlet } from 'react-router-dom';
import { ToolsContent } from './components/tools/ToolsContent.tsx';
import TopNavigationBar from './components/navigation/TopNavigationBar.tsx';
import { splitPanelI18nStrings } from './i18n/i18n-strings/split-panel.ts';
import { appLayoutAriaLabels } from './i18n/i18n-strings/app-layout.ts';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store/store.ts';
import { setNavigationSideBarOpen, setSettingsPanelOpen, setSettingsPanelPosition } from './store/preferencesSlice.ts';

/**
 * Layout component that provides the main application structure
 * Manages the top navigation bar, side navigation, split panel, and tools panel
 * Uses various contexts for state management and Redux for preferences
 * @returns JSX.Element - The main application layout
 */
export default function Layout() {
    // Get notifications from context for displaying alerts and messages
    const { notifications } = useContext(NotificationContext);
    // Get tools panel state and setter from context
    const { toolsState, setToolsState } = useContext(ToolsContext);
    // Get split panel state for showing/hiding and managing content
    const { splitPanelState } = useContext(SplitPanelContext);

    const dispatch = useDispatch();

    // Get navigation sidebar open state from Redux
    const navigationOpen = useSelector((state: RootState) => state.preferences.navigationSideBarOpen);
    // Get split panel position preference from Redux
    const splitPanelPosition = useSelector((state: RootState) => state.preferences.settingsPanelPosition);

    /**
     * Toggles the split panel position between side and bottom
     */
    const toggleSplitPanelPosition = () => {
        dispatch(setSettingsPanelPosition(splitPanelPosition === 'side' ? 'bottom' : 'side'));
    };

    /**
     * Handles changes to the navigation sidebar open state
     * @param detail Contains the new open state
     */
    const handleNavigationChange = ({ detail }: { detail: { open: boolean } }) => {
        dispatch(setNavigationSideBarOpen(detail.open));
    };

    /**
     * Handles changes to the split panel open state
     * Triggers the panel's onClose handler when closing
     * @param detail Contains the new open state
     */
    const handleSplitPanelChange = ({ detail }: { detail: { open: boolean } }) => {
        const isOpen = detail.open;
        dispatch(setSettingsPanelOpen(isOpen));
        if (!isOpen) splitPanelState.onClose();
    };

    return (
        <>
            <div id="top-nav">
                <TopNavigationBar />
            </div>
            <div>
                <AppLayout
                    headerSelector="#top-nav"
                    content={
                        <div data-testid={'main-content'}>
                            <Outlet />
                        </div>
                    }
                    contentType={'dashboard'}
                    navigationOpen={navigationOpen}
                    onNavigationChange={handleNavigationChange}
                    navigation={<SideNavigationBar />}
                    notifications={<Flashbar stackItems={true} items={notifications}></Flashbar>}
                    splitPanelOpen={splitPanelState.isOpen}
                    onSplitPanelToggle={handleSplitPanelChange}
                    splitPanel={
                        <SplitPanel
                            header={splitPanelState.header}
                            closeBehavior={'hide'}
                            i18nStrings={splitPanelI18nStrings}
                        >
                            {splitPanelState.content}
                        </SplitPanel>
                    }
                    splitPanelPreferences={{ position: splitPanelPosition }}
                    onSplitPanelPreferencesChange={toggleSplitPanelPosition}
                    stickyNotifications={true}
                    tools={<ToolsContent />}
                    toolsOpen={toolsState.toolsOpen}
                    onToolsChange={(e) =>
                        setToolsState((state: ToolsContextType) => ({ ...state, toolsOpen: e.detail.open }))
                    }
                    ariaLabels={appLayoutAriaLabels}
                />
            </div>
        </>
    );
}
