// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, Container, Header, ExpandableSection, SpaceBetween, Form } from '@cloudscape-design/components';

import AdvancedModelSettings from './AdvancedModelSettings';
import { ModelAdditionalSettings } from './ModelAdditionalSettings';
import { initModelRequiredFields, isModelParametersValid, updateRequiredFields } from './helpers';
import { StepContentProps } from '../interfaces/Steps';
import { ModelSelection } from './ModelSelection';
import { ModelProviderDropdown } from './common/ModelProvider';
import MultimodalInputSupport from './MultimodalInputSupport';


export interface ModelComponentsProps {
    model: any;
    onChange: (e: any) => void;
    setHelpPanelContent: (e: any) => void;
    setNumFieldsInError: React.Dispatch<any>;
    knowledgeBase: any;
    handleWizardNextStepLoading?: (isLoading: boolean) => void;
    showMultimodal: boolean;
}

const ModelComponents = ({
    model,
    onChange,
    setHelpPanelContent,
    setNumFieldsInError,
    knowledgeBase,
    handleWizardNextStepLoading,
    showMultimodal
}: ModelComponentsProps) => {
    return (
        <form>
            <Form>
                <SpaceBetween size="l">
                    <Container
                        header={<Header variant="h2">Model selection</Header>}
                        footer={
                            model.modelProvider.value !== '' && (
                                <ExpandableSection
                                    headerText="Additional settings"
                                    variant="footer"
                                    data-testid="step2-additional-settings-expandable"
                                >
                                    <ModelAdditionalSettings
                                        modelData={model}
                                        modelName={model.modelName}
                                        modelProvider={model.modelProvider}
                                        onChangeFn={onChange}
                                        setNumFieldsInError={setNumFieldsInError}
                                        setHelpPanelContent={setHelpPanelContent}
                                        handleWizardNextStepLoading={handleWizardNextStepLoading}
                                    />
                                </ExpandableSection>
                            )
                        }
                    >
                        <SpaceBetween size="l">
                            <ModelProviderDropdown
                                modelData={model}
                                onChangeFn={onChange}
                                setHelpPanelContent={setHelpPanelContent}
                                setNumFieldsInError={setNumFieldsInError}
                                handleWizardNextStepLoading={handleWizardNextStepLoading}
                            />

                            {model.modelProvider.value !== '' && (
                                <ModelSelection
                                    modelData={model}
                                    onChange={onChange}
                                    setHelpPanelContent={setHelpPanelContent}
                                    setNumFieldsInError={setNumFieldsInError}
                                    handleWizardNextStepLoading={handleWizardNextStepLoading}
                                />
                            )}
                        </SpaceBetween>
                    </Container>

                    {showMultimodal && (
                        <Container
                            header={<Header variant="h2">Multimodal support</Header>}
                        >
                            <MultimodalInputSupport
                                multimodalEnabled={model.multimodalEnabled}
                                setHelpPanelContent={setHelpPanelContent}
                                onChangeFn={onChange}
                            />
                        </Container>
                    )}
                </SpaceBetween>
            </Form>
        </form>
    );
};

const Model = ({
    info: { model, knowledgeBase },
    setHelpPanelContent,
    onChange,
    handleWizardNextStepLoading,
    modelVisibility
}: StepContentProps) => {
    const [numFieldsInError, setNumFieldsInError] = React.useState(0);

    const showMultimodal = modelVisibility?.showMultimodalInputSupport ?? false;

    const [requiredFields, setRequiredFields] = React.useState(initModelRequiredFields(model.modelProvider.value));
    const childProps = {
        model,
        setHelpPanelContent,
        onChange,
        numFieldsInError,
        setNumFieldsInError,
        requiredFields,
        setRequiredFields,
        knowledgeBase,
        handleWizardNextStepLoading,
        showMultimodal
    };

    const isRequiredFieldsFilled = () => {
        for (const field of requiredFields) {
            if (!model[field] || model[field].length === 0) {
                return false;
            }
        }
        return true;
    };

    const updateError = () => {
        if (numFieldsInError > 0 || !isRequiredFieldsFilled() || !isModelParametersValid(model.modelParameters)) {
            onChange({ inError: true });
        } else if (numFieldsInError === 0 && isRequiredFieldsFilled()) {
            onChange({ inError: false });
        }
    };

    React.useEffect(() => {
        updateError();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requiredFields, model.modelArn, model.guardrailIdentifier, model.guardrailVersion]);

    // prettier-ignore
    React.useEffect(() => { //NOSONAR - no need to refactor, it is already broken down into separate functions
        updateRequiredFields(
            model.modelProvider.value,
            model.enableGuardrails,
            model.bedrockInferenceType, 
            setRequiredFields);
        updateError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        numFieldsInError,
        model.modelProvider,
        model.modelName,
        model.apiKey,
        model.temperature,
        model.promptTemplate,
        model.inferenceEndpoint,
        model.modelParameters,
        model.sagemakerEndpointName,
        model.sagemakerOutputSchema,
        model.provisionedModel,
        model.enableGuardrails,
        model.inferenceProfileId,
        model.modelArn,
        model.bedrockInferenceType,
        model.MultimodalParams
    ]);

    return (
        <Box margin={{ bottom: 'l' }}>
            <SpaceBetween size="l">
                <ModelComponents {...childProps} />
                <AdvancedModelSettings {...childProps} />
            </SpaceBetween>
        </Box>
    );
};

export default Model;
