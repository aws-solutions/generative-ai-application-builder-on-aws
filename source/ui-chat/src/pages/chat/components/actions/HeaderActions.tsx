import { ButtonGroup, ButtonGroupProps } from '@cloudscape-design/components';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store/store';
import { selectUseCaseType, getUseCaseConfig } from '../../../../store/configSlice';
import { USE_CASE_TYPES } from '../../../../utils/constants';

/**
 * Props interface for HeaderActions component
 * @interface HeaderActionsProps
 * @property {() => void} onRefresh - Callback function to handle refresh action
 * @property {() => void} onSettings - Callback function to handle settings action
 */
interface HeaderActionsProps {
    onRefresh: () => void;
    onSettings: () => void;
}

/**
 * HeaderActions component that renders action buttons for chat interface
 * @component
 * @param {HeaderActionsProps} props - Component props
 * @param {() => void} props.onRefresh - Callback function to handle refresh action
 * @param {() => void} props.onSettings - Callback function to handle settings action
 * @returns {JSX.Element} ButtonGroup component with refresh and settings actions
 */
export const HeaderActions: React.FC<HeaderActionsProps> = ({ onRefresh, onSettings }) => {
    const useCaseType = useSelector((state: RootState) => selectUseCaseType(state));
    const isPromptEditingEnabled = useSelector((state: RootState) => getUseCaseConfig(state))?.LlmParams?.PromptParams?.UserPromptEditingEnabled;

    // if useCaseType is AGENT then do not show settings
    const buttonGroupItems = [
        {
            type: 'icon-button',
            id: 'refresh',
            iconName: 'refresh',
            text: 'Refresh chat'
        }
    ] as ButtonGroupProps.ItemOrGroup[];

    if (useCaseType !== USE_CASE_TYPES.AGENT && isPromptEditingEnabled) {
        buttonGroupItems.push({
            type: 'icon-button',
            id: 'settings',
            iconName: 'settings',
            text: 'Settings'
        });
    }

    return (
        <ButtonGroup
            ariaLabel="Chat actions"
            onItemClick={({ detail }) => {
                if (detail.id === 'refresh') {
                    onRefresh();
                } else if (detail.id === 'settings') {
                    onSettings();
                }
            }}
            items={buttonGroupItems}
            variant="icon"
            data-testid="chat-actions"
        />
    );
};
