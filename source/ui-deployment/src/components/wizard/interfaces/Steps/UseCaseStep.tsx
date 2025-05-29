// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DEPLOYMENT_ACTIONS, IG_DOCS, USECASE_TYPES } from '@/utils/constants';
import { Box } from '@cloudscape-design/components';
import { DEFAULT_STEP_INFO } from '../../steps-config';
import { StepContentProps, ToolHelpPanelContent } from '../Steps';
import { BaseWizardProps, BaseWizardStep } from './BaseWizardStep';
import UseCase from '../../UseCase';
import { mapUseCaseStepInfoFromDeployment } from '../../utils';

export interface UseCaseSettings extends BaseWizardProps {
    useCaseName: string;
    useCaseDescription: string;
    defaultUserEmail: string;
    deployUI: boolean;
    feedbackEnabled: boolean;
    useCaseType: string;
    useExistingUserPool: boolean;
    existingUserPoolId: string;
    useExistingUserPoolClient: boolean;
    existingUserPoolClientId: string;
}
export class UseCaseStep extends BaseWizardStep {
    public id: string = 'useCase';
    public title: string = 'Select Use Case';

    public props: UseCaseSettings = {
        useCaseType: DEFAULT_STEP_INFO.useCase.useCaseType,
        useCaseName: DEFAULT_STEP_INFO.useCase.useCaseName,
        useCaseDescription: DEFAULT_STEP_INFO.useCase.useCaseDescription,
        defaultUserEmail: DEFAULT_STEP_INFO.useCase.defaultUserEmail,
        deployUI: DEFAULT_STEP_INFO.useCase.deployUI,
        feedbackEnabled: DEFAULT_STEP_INFO.useCase.feedbackEnabled,
        useExistingUserPool: DEFAULT_STEP_INFO.useCase.useExistingUserPool,
        existingUserPoolId: DEFAULT_STEP_INFO.useCase.existingUserPoolId,
        useExistingUserPoolClient: DEFAULT_STEP_INFO.useCase.useExistingUserPoolClient,
        existingUserPoolClientId: DEFAULT_STEP_INFO.useCase.existingUserPoolClientId,
        inError: false
    };

    public toolContent: ToolHelpPanelContent = {
        title: 'Deploying a new use case',
        content: <Box variant="p">Use this page to create a new deployment</Box>,
        links: [
            {
                href: IG_DOCS.USE_CASES,
                text: 'Learn more about use cases'
            }
        ]
    };

    constructor(useCaseType: string = USECASE_TYPES.TEXT) {
        super();
        this.props.useCaseType = useCaseType;
    }

    public contentGenerator = (props: StepContentProps) => {
        return <UseCase {...props} />;
    };

    public mapStepInfoFromDeployment = (selectedDeployment: any, deploymentAction: string): void => {
        ({
            useCaseType: this.props.useCaseType,
            useCaseName: this.props.useCaseName,
            defaultUserEmail: this.props.defaultUserEmail,
            useCaseDescription: this.props.useCaseDescription,
            deployUI: this.props.deployUI,
            feedbackEnabled: this.props.feedbackEnabled,
            useExistingUserPool: this.props.useExistingUserPool,
            existingUserPoolId: this.props.existingUserPoolId,
            useExistingUserPoolClient: this.props.useExistingUserPoolClient,
            existingUserPoolClientId: this.props.existingUserPoolClientId,
            inError: this.props.inError
        } = mapUseCaseStepInfoFromDeployment(selectedDeployment));

        if (deploymentAction === DEPLOYMENT_ACTIONS.CLONE) {
            this.props.useCaseName += '-clone';
        }
    };
}
