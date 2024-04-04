/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import React from 'react';
import { Box, Container, Header, ExpandableSection, SpaceBetween, Form } from '@cloudscape-design/components';

import AdvancedModelSettings from './AdvancedModelSettings';
import { ModelAdditionalSettings } from './ModelAdditionalSettings';
import { initModelRequiredFields, isModelParametersValid, updateRequiredFields } from './helpers';
import { StepContentProps } from '../interfaces/Steps';
import { ModelSelection } from './ModelSelection';
import { ModelProviderDropdown } from './common/ModelProvider';

export interface ModelComponentsProps {
    model: any;
    onChange: (e: any) => void;
    setHelpPanelContent: (e: any) => void;
    setNumFieldsInError: React.Dispatch<any>;
    knowledgeBase: any;
}

const ModelComponents = ({
    model,
    onChange,
    setHelpPanelContent,
    setNumFieldsInError,
    knowledgeBase
}: ModelComponentsProps) => {
    return (
        <form>
            <Form>
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
                                    isRagEnabled={knowledgeBase.isRagRequired}
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
                        />

                        {model.modelProvider.value !== '' && (
                            <ModelSelection
                                modelData={model}
                                onChange={onChange}
                                setHelpPanelContent={setHelpPanelContent}
                                setNumFieldsInError={setNumFieldsInError}
                            />
                        )}
                    </SpaceBetween>
                </Container>
            </Form>
        </form>
    );
};

const Model = ({ info: { model, knowledgeBase }, setHelpPanelContent, onChange }: StepContentProps) => {
    const [numFieldsInError, setNumFieldsInError] = React.useState(0);

    const [requiredFields, setRequiredFields] = React.useState(initModelRequiredFields(model.modelProvider.value));
    const childProps = {
        model,
        setHelpPanelContent,
        onChange,
        numFieldsInError,
        setNumFieldsInError,
        requiredFields,
        setRequiredFields,
        knowledgeBase
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
    }, [requiredFields]);

    // prettier-ignore
    React.useEffect(() => { //NOSONAR - no need to refactor, it is already broken down into separate functions
        updateRequiredFields(model.modelProvider.value, setRequiredFields);
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
        model.sagemakerOutputSchema
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
