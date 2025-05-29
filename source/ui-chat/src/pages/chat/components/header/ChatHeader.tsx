// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Header } from '@cloudscape-design/components';
import { memo } from 'react';
import { HeaderActions } from '../actions/HeaderActions';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store/store';
import { selectUseCaseType } from '../../../../store/configSlice';

/**
 * Props interface for the ChatHeader component
 * @interface ChatHeaderProps
 * @property {() => void} onRefresh - Callback function to refresh the chat
 * @property {() => void} onSettings - Callback function to open settings
 */
interface ChatHeaderProps {
    onRefresh: () => void;
    onSettings: () => void;
}

/**
 * ChatHeader component displays the header with use case type and name
 * @param {ChatHeaderProps} props - Component props
 * @param {() => void} props.onRefresh - Callback function to refresh the chat
 * @param {() => void} props.onSettings - Callback function to open settings
 * @returns {JSX.Element} Header component with use case information and actions
 */
export const ChatHeader = memo(({ onRefresh, onSettings }: ChatHeaderProps) => {
    const useCaseType = useSelector((state: RootState) => selectUseCaseType(state));
    const useCaseName = useSelector((state: RootState) => state.config.runtimeConfig?.UseCaseConfig?.UseCaseName);

    return (
        <Header variant="h3" actions={<HeaderActions onRefresh={onRefresh} onSettings={onSettings} />}>
            {useCaseType.toLocaleLowerCase()}: {useCaseName}
        </Header>
    );
});
