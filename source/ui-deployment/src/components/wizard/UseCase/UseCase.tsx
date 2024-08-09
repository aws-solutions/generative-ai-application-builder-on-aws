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

import { USE_CASE_OPTIONS } from '../steps-config';
import { DEPLOYMENT_ACTIONS } from '../../../utils/constants';

import HomeContext from '../../../contexts/home.context';
import UseCaseDescription from './UseCaseDescription';
import UseCaseName from './UseCaseName';
import UseCaseTypeSelection from './UseCaseTypeSelection';
import { StepContentProps } from '../interfaces/Steps';
import DeployUI from './DeployUI';
import UserPool from './UserPool';

const UseCase = ({ info: { useCase }, onChange, setHelpPanelContent }: StepContentProps) => {
    const {
        state: { deploymentAction }
    } = useContext(HomeContext);

    const [numFieldsInError, setNumFieldsInError] = React.useState(0);

    const initRequiredFieldsValue = () => {
        const requiredFields = ['useCaseName'];

        if (useCase.existingUserPool) {
            requiredFields.push('userPoolId');
        }
        return requiredFields;
    };

    const [requiredFields, setRequiredFields] = React.useState(initRequiredFieldsValue);


    React.useEffect(() => {
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
    }, [numFieldsInError, useCase.useCaseName, useCase.useCaseDescription, useCase.defaultUserEmail, useCase.existingUserPool, useCase.userPoolId]);


    React.useEffect(() => {
        if (useCase.existingUserPool) {
            setRequiredFields(['useCaseName', 'userPoolId']);
        } else {
            setRequiredFields(['useCaseName']);
        }

        if ((useCase.existingUserPool && useCase.userPoolId || !useCase.existingUserPool) && useCase.useCaseName) {
            setNumFieldsInError(0);
            onChange({ inError: false });
        }

    }, [useCase.useCaseName, useCase.existingUserPool, useCase.userPoolId])


    return (
        <div>
            <Box margin={{ bottom: 'l' }}>
                <Container header={<Header variant="h2">Use case options</Header>}>
                    <SpaceBetween size="s">
                        <UseCaseTypeSelection
                            onChangeFn={onChange}
                            selectedOption={useCase.useCase}
                            useCaseTypeOptions={USE_CASE_OPTIONS}
                        />
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
                        existingUserPool={useCase.existingUserPool}
                        userPoolId={useCase.userPoolId}
                        setHelpPanelContent={setHelpPanelContent}
                        onChangeFn={onChange}
                        setNumFieldsInError={setNumFieldsInError}
                    />
                </SpaceBetween>
            </Container>
        </div>
    );
};

export default UseCase;
