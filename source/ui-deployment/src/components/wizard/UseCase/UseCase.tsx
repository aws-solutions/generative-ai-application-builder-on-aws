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
 **********************************************************************************************************************/

import React, { useContext } from 'react';
import { Box, Container, Header, SpaceBetween } from '@cloudscape-design/components';
import UserEmail from './UserEmail';

import { DEPLOYMENT_ACTIONS } from '../../../utils/constants';

import HomeContext from '../../../contexts/home.context';
import UseCaseDescription from './UseCaseDescription';
import UseCaseName from './UseCaseName';
import { StepContentProps } from '../interfaces/Steps';
import DeployUI from './DeployUI';
import UserPool from './UserPool/UserPool';

const UseCase = ({ info: { useCase }, onChange, setHelpPanelContent }: StepContentProps) => {
    const {
        state: { deploymentAction }
    } = useContext(HomeContext);

    const [numFieldsInError, setNumFieldsInError] = React.useState(0);

    const initRequiredFieldsValue = () => {
        const requiredFields = ['useCaseName'];

        if (useCase.useExistingUserPool) {
            requiredFields.push('existingUserPoolId');
        }
        if (useCase.useExistingUserPoolClient) {
            requiredFields.push('existingUserPoolClientId');
        }
        return requiredFields;
    };

    const [requiredFields, setRequiredFields] = React.useState(initRequiredFieldsValue);

    React.useEffect(() => {
        if (useCase.useExistingUserPool && useCase.useExistingUserPoolClient) {
            setRequiredFields(['useCaseName', 'existingUserPoolId', 'existingUserPoolClientId']);
        } else if (useCase.useExistingUserPool) {
            setRequiredFields(['useCaseName', 'existingUserPoolId']);
        } else {
            setRequiredFields(['useCaseName']);
        }

        const isRequiredFieldsFilled = () => {
            for (const field of requiredFields) {
                if (useCase[field].length === 0) {
                    return false;
                }
            }
            return true;
        };

        const updateError = () => {
            if (numFieldsInError > 0 || !isRequiredFieldsFilled()) {
                onChange({ inError: true });
            } else if (numFieldsInError === 0 && isRequiredFieldsFilled()) {
                onChange({ inError: false });
            }
        };
        updateError();
    }, [
        numFieldsInError,
        useCase.useCaseName,
        useCase.useCaseDescription,
        useCase.defaultUserEmail,
        useCase.existingUserPoolId,
        useCase.existingUserPoolClientId,
        useCase.useExistingUserPool,
        useCase.useExistingUserPoolClient
    ]);

    React.useEffect(() => {
        if (useCase.useExistingUserPool && useCase.useExistingUserPoolClient) {
            setRequiredFields(['useCaseName', 'existingUserPoolId', 'existingUserPoolClientId']);
        } else if (useCase.useExistingUserPool) {
            setRequiredFields(['useCaseName', 'existingUserPoolId']);
        } else {
            setRequiredFields(['useCaseName']);
        }

        if (
            ((useCase.useExistingUserPool && useCase.existingUserPoolId) || !useCase.useExistingUserPool) &&
            ((useCase.useExistingUserPoolClient && useCase.existingUserPoolClientId) || !useCase.useExistingUserPool) &&
            useCase.useCaseName
        ) {
            setNumFieldsInError(0);
            onChange({ inError: false });
        }
    }, [useCase.useExistingUserPool, useCase.useExistingUserPoolClient, useCase.existingUserPoolId]);

    return (
        <Box>
            <Box margin={{ bottom: 'l' }}>
                <Container header={<Header variant="h2">Use case options</Header>}>
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
                        <DeployUI
                            deployUI={useCase.deployUI}
                            useCaseType={useCase.useCaseType}
                            setHelpPanelContent={setHelpPanelContent}
                            onChangeFn={onChange}
                        />
                    </SpaceBetween>
                </Container>
            </Box>
            <Container header={<Header variant="h2">Manage user access</Header>}>
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
        </Box>
    );
};

export default UseCase;
