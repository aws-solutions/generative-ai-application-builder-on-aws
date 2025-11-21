// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useContext } from 'react';
import { Box, Container, Header, SpaceBetween } from '@cloudscape-design/components';
import UserEmail from './UserEmail';

import { DEPLOYMENT_ACTIONS, DEFAULT_COMPONENT_VISIBILITY } from '../../../utils/constants';

import HomeContext from '../../../contexts/home.context';
import UseCaseDescription from './UseCaseDescription';
import UseCaseName from './UseCaseName';
import { StepContentProps } from '../interfaces/Steps';
import DeployUI from './DeployUI';
import UserPool from './UserPool/UserPool';
import EnableFeedback from './EnableFeedback';
import EnableProvisionedConcurrency from './EnableProvisionedConcurrency';

const UseCase = ({ info: { useCase }, onChange, setHelpPanelContent, visibility = null }: StepContentProps) => {
    const {
        state: { deploymentAction }
    } = useContext(HomeContext);

    const [numFieldsInError, setNumFieldsInError] = React.useState(0);
    const componentVisibility = visibility ?? DEFAULT_COMPONENT_VISIBILITY;

    const initRequiredFieldsValue = (): string[] => {
        const requiredFields: string[] = [];

        if (componentVisibility.showUseCaseOptions) {
            requiredFields.push('useCaseName');
        }

        if (componentVisibility.showManageUserAccess) {
            if (useCase.useExistingUserPool) {
                requiredFields.push('existingUserPoolId');
            }
            if (useCase.useExistingUserPoolClient) {
                requiredFields.push('existingUserPoolClientId');
            }
        }
        return requiredFields;
    };

    const [requiredFields, setRequiredFields] = React.useState<string[]>(initRequiredFieldsValue);

    const isUseCaseNameValid = (): boolean => {
        return !componentVisibility.showUseCaseOptions || (useCase.useCaseName && useCase.useCaseName.length > 0);
    };

    const isUserPoolIdValid = (): boolean => {
        return !useCase.useExistingUserPool ||
               !componentVisibility.showManageUserAccess ||
               (useCase.existingUserPoolId && useCase.existingUserPoolId.length > 0);
    };

    const isUserPoolClientIdValid = (): boolean => {
        return !useCase.useExistingUserPoolClient ||
               !componentVisibility.showManageUserAccess ||
               (useCase.existingUserPoolClientId && useCase.existingUserPoolClientId.length > 0);
    };

    const areAllFieldsValid = (): boolean => {
        return isUseCaseNameValid() && isUserPoolIdValid() && isUserPoolClientIdValid();
    };

    React.useEffect(() => {
        // Set default values for hidden components
        if (!componentVisibility.showDeployUI && useCase.deployUI !== false) {
            onChange({ deployUI: false });
        }
        if (!componentVisibility.showCollectUserFeedback && useCase.feedbackEnabled !== false) {
            onChange({ feedbackEnabled: false });
        }
        if (!componentVisibility.showManageUserAccess) {
            // Set default values for user access fields when hidden
            if (useCase.defaultUserEmail !== '') {
                onChange({ defaultUserEmail: '' });
            }
            if (useCase.useExistingUserPool !== false) {
                onChange({ useExistingUserPool: false });
            }
        }
        if(!componentVisibility.showPerformanceOptimization && useCase.provisionedConcurrencyValue !== 0) {
            onChange({ provisionedConcurrencyValue: 0 })
        }

        // Update required fields based on visibility
        const requiredFields: string[] = [];

        if (componentVisibility.showUseCaseOptions) {
            requiredFields.push('useCaseName');
        }

        if (componentVisibility.showManageUserAccess) {
            if (useCase.useExistingUserPool) {
                requiredFields.push('existingUserPoolId');
            }
            if (useCase.useExistingUserPoolClient) {
                requiredFields.push('existingUserPoolClientId');
            }
        }

        setRequiredFields(requiredFields);

        const allFieldsFilled = areAllFieldsValid();

        if (allFieldsFilled && numFieldsInError === 0) {
            onChange({ inError: false });
        } else if (!allFieldsFilled || numFieldsInError > 0) {
            onChange({ inError: true });
        }
    }, [
        useCase.deployUI,
        useCase.feedbackEnabled,
        useCase.defaultUserEmail,
        useCase.useExistingUserPool,
        useCase.useExistingUserPoolClient,
        useCase.existingUserPoolId,
        useCase.existingUserPoolClientId,
        useCase.useCaseName,
        useCase.provisionedConcurrencyValue,
        componentVisibility.showDeployUI,
        componentVisibility.showManageUserAccess,
        componentVisibility.showCollectUserFeedback,
        componentVisibility.showUseCaseOptions,
        componentVisibility.showPerformanceOptimization,
        numFieldsInError
    ]);

    return (
        <Box>
            {/*Conditionally rendered components using componentVisibility*/}
            <SpaceBetween size="l">
                {componentVisibility.showUseCaseOptions && (
                    <Container
                        header={
                            <Header variant="h2" data-testid="wizard-use-case-options-header">
                                Use case options
                            </Header>
                        }
                    >
                        <SpaceBetween size="s">
                            <UseCaseName
                                name={useCase.useCaseName}
                                disabled={deploymentAction === DEPLOYMENT_ACTIONS.EDIT}
                                onChangeFn={onChange}
                                setNumFieldsInError={setNumFieldsInError}
                            />
                            <UseCaseDescription
                                descriptionValue={useCase.useCaseDescription}
                                setNumFieldsInError={setNumFieldsInError}
                                onChangeFn={onChange}
                            />
                        </SpaceBetween>
                    </Container>
                )}

                {componentVisibility.showDeployUI && (
                    <Container
                        header={
                            <Header variant="h2" data-testid="wizard-deploy-ui-header">
                                Deploy UI
                            </Header>
                        }
                    >
                        <DeployUI
                            deployUI={useCase.deployUI}
                            useCaseType={useCase.useCaseType}
                            setHelpPanelContent={setHelpPanelContent}
                            onChangeFn={onChange}
                        />
                    </Container>
                )}

                {componentVisibility.showManageUserAccess && (
                    <Container
                        header={
                            <Header variant="h2" data-testid="wizard-manage-user-access-header">
                                Manage user access
                            </Header>
                        }
                    >
                        <SpaceBetween size="l">
                            <UserEmail
                                email={useCase.defaultUserEmail}
                                onChangeFn={onChange}
                                setHelpPanelContent={setHelpPanelContent}
                                setNumFieldsInError={setNumFieldsInError}
                            />
                            <UserPool
                                useExistingUserPool={useCase.useExistingUserPool}
                                existingUserPoolId={useCase.existingUserPoolId}
                                useExistingUserPoolClient={useCase.useExistingUserPoolClient}
                                existingUserPoolClientId={useCase.existingUserPoolClientId}
                                setHelpPanelContent={setHelpPanelContent}
                                onChangeFn={onChange}
                                setNumFieldsInError={setNumFieldsInError}
                                disabled={deploymentAction === DEPLOYMENT_ACTIONS.EDIT}
                            />
                        </SpaceBetween>
                    </Container>
                )}

                {componentVisibility.showPerformanceOptimization && (
                    <Container
                        header={
                            <Header variant="h2">Performance Optimization</Header>
                        }
                    >
                        <EnableProvisionedConcurrency
                            provisionedConcurrencyValue={useCase.provisionedConcurrencyValue}
                            setHelpPanelContent={setHelpPanelContent}
                            onChangeFn={onChange}
                            setNumFieldsInError={setNumFieldsInError}
                        />
                    </Container>
                )}

                {componentVisibility.showCollectUserFeedback && (
                    <Container
                        header={
                            <Header variant="h2" data-testid="wizard-collect-user-feedback-header">
                                Collect User Feedback
                            </Header>
                        }
                    >
                        <EnableFeedback
                            feedbackEnabled={useCase.feedbackEnabled}
                            setHelpPanelContent={setHelpPanelContent}
                            onChangeFn={onChange}
                        />
                    </Container>
                )}
            </SpaceBetween>
        </Box>
    );
};

export default UseCase;
