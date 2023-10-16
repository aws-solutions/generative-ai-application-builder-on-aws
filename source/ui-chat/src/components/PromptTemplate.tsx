import { Alert, Button, SpaceBetween, Textarea } from '@cloudscape-design/components';
import { FC, useState, useContext } from 'react';
import HomeContext from '../home/home.context';
import { MIN_PROMPT_TEMPLATE_LENGTH, MAX_PROMPT_TEMPLATE_LENGTH } from '../utils/constants';

interface Props {
    onChangePrompt: (prompt: string) => void;
    handleShowPromptWindow: (show: boolean) => void;
    showPromptWindow: boolean;
}

export const PromptTemplate: FC<Props> = ({ onChangePrompt, showPromptWindow, handleShowPromptWindow }) => {
    const {
        state: { defaultPromptTemplate, promptTemplate, selectedConversation, RAGEnabled }
    } = useContext(HomeContext);
    const [value, setValue] = useState<string>(promptTemplate ? promptTemplate : defaultPromptTemplate);
    const [errorMessage, setErrorMessage] = useState('');
    const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

    const isPromptTemplateValid = () => {
        let errors = '';
        const requiredPlaceholders = RAGEnabled ? ['history', 'input', 'context'] : ['history', 'input'];
        if (value.length < MIN_PROMPT_TEMPLATE_LENGTH || value.length > MAX_PROMPT_TEMPLATE_LENGTH) {
            errors +=
                `Total prompt length must be between ` +
                MIN_PROMPT_TEMPLATE_LENGTH +
                ' and ' +
                MAX_PROMPT_TEMPLATE_LENGTH +
                ' characters.\n';
        }

        for (const requiredPlaceholder of requiredPlaceholders) {
            const formattedPlaceholder = `{${requiredPlaceholder}}`;
            let start = 0;
            let found = false;
            let counter = 0;
            while (start < promptTemplate.length && counter < 3) {
                start = value.indexOf(formattedPlaceholder, start);
                if (start === -1 && found) {
                    break;
                } else if (start === -1) {
                    errors += `The prompt template does not contain the required placeholder: ${formattedPlaceholder}. \n`;
                    break;
                } else if (found) {
                    errors += `The prompt template contains more than one occurrence of the required placeholder: ${formattedPlaceholder}. \n`;
                    break;
                } else {
                    found = true;
                    start += formattedPlaceholder.length;
                }
                counter += 1;
            }
        }
        setErrorMessage(errors);
        return errors.length === 0;
    };

    const handleSave = () => {
        if (value.length > 0) {
            if (isPromptTemplateValid()) {
                onChangePrompt(value);
                setSaveSuccessMessage('Prompt template saved');
            } else {
                setSaveSuccessMessage('');
            }
        } else {
            onChangePrompt(defaultPromptTemplate);
        }
    };

    if (showPromptWindow) {
        return (
            <div data-testid="prompt-template">
                <label>{'Prompt template (optional)'}</label>
                <SpaceBetween size="xxs" direction="vertical">
                    <Textarea
                        data-testid="prompt-template-textarea"
                        placeholder={defaultPromptTemplate}
                        value={value || ''}
                        rows={10}
                        onChange={({ detail }) => setValue(detail.value)}
                        disabled={selectedConversation!.messages.length > 0}
                    />

                    <SpaceBetween size="xxs" direction="horizontal">
                        <Button
                            data-testid="save-prompt-button"
                            variant="primary"
                            onClick={() => handleSave()}
                            disabled={selectedConversation!.messages.length > 0}
                        >
                            Save
                        </Button>
                        <Button
                            data-testid="reset-to-default-prompt button"
                            onClick={() => {
                                setValue(defaultPromptTemplate);
                                onChangePrompt(defaultPromptTemplate);
                                setErrorMessage('');
                                setSaveSuccessMessage('Prompt template set to default');
                            }}
                            disabled={selectedConversation!.messages.length > 0}
                        >
                            Reset to default
                        </Button>
                        <Button
                            onClick={() => {
                                handleShowPromptWindow(false);
                            }}
                        >
                            Cancel
                        </Button>
                    </SpaceBetween>
                    <div>
                        {errorMessage && (
                            <Alert
                                statusIconAriaLabel="Error"
                                type="error"
                                header="Invalid prompt template"
                                data-testid="invalid-prompt-error"
                            >
                                {errorMessage}
                            </Alert>
                        )}
                        {saveSuccessMessage && (
                            <Alert
                                statusIconAriaLabel="Success"
                                type="success"
                                header={saveSuccessMessage}
                                data-testid="save-prompt-success"
                            />
                        )}
                    </div>
                </SpaceBetween>
            </div>
        );
    }
    return <div></div>;
};
