// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import { HeaderActions } from '../../../../../pages/chat/components/actions/HeaderActions';
import { testStoreFactory } from '../../../../utils/test-redux-store-factory';
import { DEFAULT_AGENT_CONFIG } from '../../../../utils/test-configs';

describe('HeaderActions', () => {
    const onRefresh = vi.fn();
    const onSettings = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders both refresh and settings buttons for TEXT use case', () => {
        const { container } = testStoreFactory.renderWithStore(
            <HeaderActions onRefresh={onRefresh} onSettings={onSettings} />
        );

        const wrapper = createWrapper(container);
        const buttonGroup = wrapper.findButtonGroup();

        expect(buttonGroup).not.toBeNull();
        const buttons = wrapper.findAllButtons();
        expect(buttons).toHaveLength(2);
    });

    it('renders only refresh button for AGENT use case', () => {
        const { container } = testStoreFactory.renderWithStore(
            <HeaderActions onRefresh={onRefresh} onSettings={onSettings} />,
            {
                config: {
                    runtimeConfig: DEFAULT_AGENT_CONFIG
                }
            }
        );

        const wrapper = createWrapper(container);
        const buttonGroup = wrapper.findButtonGroup();

        expect(buttonGroup).not.toBeNull();
        const refreshButton = buttonGroup?.findButtonById('refresh');
        expect(refreshButton).not.toBeNull();
    });

    it('calls onRefresh when refresh button is clicked', () => {
        const { container } = testStoreFactory.renderWithStore(
            <HeaderActions onRefresh={onRefresh} onSettings={onSettings} />
        );

        const wrapper = createWrapper(container);
        const refreshButton = wrapper.findButtonGroup()?.findButtonById('refresh');
        expect(refreshButton).not.toBeNull();

        refreshButton?.click();
        expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('calls onSettings when settings button is clicked (TEXT use case)', () => {
        const { container } = testStoreFactory.renderWithStore(
            <HeaderActions onRefresh={onRefresh} onSettings={onSettings} />
        );

        const wrapper = createWrapper(container);
        const settingsButton = wrapper.findButtonGroup()?.findButtonById('settings');
        expect(settingsButton).not.toBeNull();

        settingsButton?.click();
        expect(onSettings).toHaveBeenCalledTimes(1);
    });

    it('has correct aria-label', () => {
        const { container } = testStoreFactory.renderWithStore(
            <HeaderActions onRefresh={onRefresh} onSettings={onSettings} />
        );

        const wrapper = createWrapper(container);
        const buttonGroup = wrapper.findButtonGroup();
        expect(buttonGroup).not.toBeNull();

        expect(buttonGroup?.getElement()).toHaveAttribute('aria-label', 'Chat actions');
    });
});
