// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { useState, useContext, useEffect } from 'react';
import { Alert, Button, FormField, SpaceBetween, Textarea } from '@cloudscape-design/components';
import { SplitPanelContext } from '../../../../contexts/SplitPanelContext';
import { useDispatch, useSelector } from 'react-redux';
import { formatCharacterCount, validatePromptTemplate } from '../../../../utils/validation';

import { RootState } from '../../../../store/store';
import { setPromptTemplate } from '../../../../store/preferencesSlice';
import {
    getModelProviderName,
    getPromptTemplateLength,
    getRagEnabledState,
    selectDefaultPromptTemplate
} from '../../../../store/configSlice';
import { MODEL_PROVIDER } from '../../../../utils/constants';

/**
 * SplitPanelSettings component for managing system prompt templates
 * Allows users to view, edit, save and reset the system prompt used by the AI assistant
 * Handles validation of prompt templates and displays success/error messages
 * @returns JSX.Element - The rendered SplitPanelSettings component
 */
const SplitPanelSettings = () => {
    const dispatch = useDispatch();

    // State for managing prompt value, validation errors and success messages
    const [promptValue, setPromptValue] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);

    const { setSplitPanelState } = useContext(SplitPanelContext);

    // Get preferences and configuration from Redux store
    const preferences = useSelector((state: RootState) => state.preferences);

    const defaultPromptTemplate = useSelector((state: RootState) => selectDefaultPromptTemplate(state));
    const savedPromptTemplate = preferences.promptTemplate;

    const isRagEnabled = useSelector((state: RootState) => getRagEnabledState(state)) ?? false;

    const maxPromptLength = useSelector((state: RootState) => getPromptTemplateLength(state));

    const modelProvider = useSelector((state: RootState) => getModelProviderName(state));

    /**
     * Initialize prompt value on component mount
     * Uses saved prompt if available, otherwise uses default template
     */
    useEffect(() => {
        // Use saved prompt if it exists, otherwise use the default from runtime config
        const initialPrompt = savedPromptTemplate || defaultPromptTemplate;
        setPromptValue(initialPrompt);

        // If there's no saved prompt yet, initialize Redux with default template
        if (!savedPromptTemplate && defaultPromptTemplate) {
            dispatch(setPromptTemplate(defaultPromptTemplate));
        }

        const { error } = validatePromptTemplate({
            promptTemplate: initialPrompt,
            isRagEnabled,
            modelProvider
        });
        setError(error);
    }, [savedPromptTemplate, defaultPromptTemplate, isRagEnabled, modelProvider, dispatch]);

    /**
     * Handles changes to the prompt text
     * Validates input and updates error state
     * @param value - The new prompt text value
     */
    const handlePromptChange = (value: string) => {
        setPromptValue(value);
        const { error } = validatePromptTemplate({
            promptTemplate: value,
            isRagEnabled,
            maxPromptTemplateLength: maxPromptLength,
            modelProvider
        });
        setError(error);
        setSuccessMessage('');
        setShowSuccessAlert(false);
    };

    /**
     * Saves the current prompt value if valid
     * Updates Redux store and shows success message
     */
    const handleSave = () => {
        const { isValid, error } = validatePromptTemplate({
            promptTemplate: promptValue,
            isRagEnabled,
            modelProvider
        });

        if (isValid) {
            dispatch(setPromptTemplate(promptValue));
            setSuccessMessage('System prompt updated successfully');
            setError('');
            setShowSuccessAlert(true);

            setTimeout(() => {
                setShowSuccessAlert(false);
            }, 3000);
        } else {
            setError(error);
            setSuccessMessage('');
            setShowSuccessAlert(false);
        }
    };

    /**
     * Resets prompt to default template
     * Updates Redux store and shows success message
     */
    const handleReset = () => {
        if (defaultPromptTemplate) {
            setPromptValue(defaultPromptTemplate);
            dispatch(setPromptTemplate(defaultPromptTemplate));
            const { error } = validatePromptTemplate({
                promptTemplate: defaultPromptTemplate,
                isRagEnabled,
                modelProvider
            });
            setError(error);
            setSuccessMessage('System prompt reset to default');
            setShowSuccessAlert(true);

            setTimeout(() => {
                setShowSuccessAlert(false);
            }, 3000);
        }
    };

    /**
     * Generates constraint text based on RAG state, model provider, and max length
     * @param isRagEnabled - Whether RAG is enabled
     * @param maxLength - Maximum allowed prompt length
     * @param modelProvider - The model provider (SageMaker, Bedrock, etc.)
     * @returns Formatted constraint text string
     */
    const getConstraintText = (isRagEnabled: boolean, maxLength: number, modelProvider?: string): string => {
        let placeholderText = '';
        
        if (modelProvider === MODEL_PROVIDER.SAGEMAKER) {
            if (isRagEnabled) {
                placeholderText = 'Must include {context}, {input}, and {history} exactly once.';
            } else {
                placeholderText = 'Must include both {input} and {history} exactly once.';
            }
        } else {
            // For non-SageMaker providers
            placeholderText = isRagEnabled ? 'Must include {context} exactly once.' : '';
        }

        return `${placeholderText} Maximum ${formatCharacterCount(maxLength)} characters.`;
    };

    // Add a disabled state for the Reset button
    const isDefaultPrompt = promptValue === defaultPromptTemplate;

    return (
        <SpaceBetween size="m">
            <FormField
                label="System prompt"
                description="Customize the system prompt to guide the AI assistant's behavior"
                errorText={error}
                constraintText={getConstraintText(isRagEnabled, maxPromptLength, modelProvider)}
                stretch
            >
                <Textarea
                    value={promptValue}
                    onChange={({ detail }) => handlePromptChange(detail.value)}
                    rows={20}
                    spellcheck={true}
                    placeholder="Enter system prompt..."
                />
            </FormField>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <Button
                    onClick={() => setSplitPanelState((prev) => ({ ...prev, isOpen: false }))}
                    variant="link"
                    data-testid="cancel-prompt-btn"
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleReset}
                    variant="normal"
                    disabled={isDefaultPrompt}
                    data-testid="reset-prompt-btn"
                >
                    Reset to default
                </Button>
                <Button
                    onClick={handleSave}
                    variant="primary"
                    disabled={!!error || promptValue === savedPromptTemplate}
                    data-testid="save-prompt-btn"
                >
                    Save
                </Button>
            </div>
            {showSuccessAlert && (
                <Alert
                    type="success"
                    dismissible
                    onDismiss={() => setShowSuccessAlert(false)}
                    header="Success"
                    data-testid="prompt-save-reset-success-notification"
                >
                    {successMessage}
                </Alert>
            )}
        </SpaceBetween>
    );
};

export { SplitPanelSettings };