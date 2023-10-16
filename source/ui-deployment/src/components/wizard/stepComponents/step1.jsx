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

import React, { useContext } from 'react';
import {
    Box,
    Container,
    Header,
    FormField,
    SpaceBetween,
    Select,
    Input,
    Textarea
} from '@cloudscape-design/components';
import { USE_CASE_OPTIONS } from '../steps-config';
import { TOOLS_CONTENT } from '../tools-content.jsx';
import { getFieldOnChange, updateNumFieldsInError } from '../utils';
import { InfoLink } from '../../commons/common-components';
import {
    MIN_USE_CASE_NAME_LENGTH,
    MAX_USE_CASE_NAME_LENGTH,
    MIN_USE_CASE_DESCRIPTION_LENGTH,
    MAX_USE_CASE_DESCRIPTION_LENGTH,
    DEPLOYMENT_ACTIONS
} from '../../../utils/constants';
import HomeContext from '../../../home/home.context';

const { useCase: useCaseToolsContent } = TOOLS_CONTENT;

const UseCase = ({ info: { useCase }, onChange, setHelpPanelContent }) => {
    const {
        state: { deploymentAction }
    } = useContext(HomeContext);

    const [numFieldsInError, setNumFieldsInError] = React.useState(0);
    const [useCaseNameError, setUseCaseNameError] = React.useState('');
    const [defaultUserEmailError, setDefaultUserEmailError] = React.useState('');
    const [useCaseDescriptionError, setUseCaseDescriptionError] = React.useState('');
    const requiredFields = ['useCaseName'];

    const onUseCaseChange = getFieldOnChange('select', 'useCase', onChange);

    const onUseCaseNameChange = ({ detail }) => {
        onChange({ useCaseName: detail.value });
        let errors = '';
        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }
        if (!isNaN(parseInt(detail.value.charAt(0)))) {
            errors += 'First character must be a letter. ';
        }
        if (!detail.value.match(`^[a-zA-Z0-9-]{${MIN_USE_CASE_NAME_LENGTH},${MAX_USE_CASE_NAME_LENGTH}}$`)) {
            errors +=
                'Can only include alphanumeric characters and hyphens and must be between ' +
                MIN_USE_CASE_NAME_LENGTH +
                ' and ' +
                MAX_USE_CASE_NAME_LENGTH +
                ' characters. ';
        }
        if (detail.value.indexOf('--') !== -1 || detail.value.charAt(detail.value.length - 1) === '-') {
            errors += 'Cannot end with a hyphen or contain two consecutive hyphens. ';
        }
        updateNumFieldsInError(errors, useCaseNameError, setNumFieldsInError);
        setUseCaseNameError(errors);
    };

    const onUseCaseDescriptionChange = ({ detail }) => {
        onChange({ useCaseDescription: detail.value });
        let errors = '';
        if (!isNaN(parseInt(detail.value.charAt(0)))) {
            errors += 'First character must be a letter. ';
        }
        if (
            detail.value !== '' &&
            !detail.value.match(
                `^[a-zA-Z0-9_+: -."'{}\n\r\t,;/\\\\\\*&%$#@!()=+~^|<>?]+$]{${MIN_USE_CASE_DESCRIPTION_LENGTH},${MAX_USE_CASE_DESCRIPTION_LENGTH}}$`
            )
        ) {
            errors +=
                'Can only include alphanumeric characters, -, _, +, :, and spaces and must be between ' +
                MIN_USE_CASE_DESCRIPTION_LENGTH +
                ' and ' +
                MAX_USE_CASE_DESCRIPTION_LENGTH +
                ' characters. ';
        }

        updateNumFieldsInError(errors, useCaseDescriptionError, setNumFieldsInError);
        setUseCaseDescriptionError(errors);
    };

    const onDefaultUserEmail = ({ detail }) => {
        onChange({ defaultUserEmail: detail.value });
        let errors = '';

        if (detail.value !== '' && !detail.value.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i)) {
            errors += 'invalid email address. ';
        }

        updateNumFieldsInError(errors, defaultUserEmailError, setNumFieldsInError);
        setDefaultUserEmailError(errors);
    };

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
    }, [numFieldsInError, useCase.useCaseName, useCase.useCaseDescription, useCase.defaultUserEmail]);

    return (
        <Box margin={{ bottom: 'l' }}>
            <Container header={<Header variant="h2">Use case options</Header>}>
                <SpaceBetween size="s">
                    <FormField
                        label="Use case type*"
                        description="Select the type of Generative AI application to deploy."
                        data-testid="use-case-type-field"
                    >
                        <Select
                            options={USE_CASE_OPTIONS}
                            onChange={onUseCaseChange}
                            selectedAriaLabel="Selected"
                            selectedOption={useCase.useCase}
                        />
                    </FormField>
                    <FormField
                        label="Name*"
                        description="A friendly name to help you identify this deployment."
                        errorText={useCaseNameError}
                        data-testid="use-case-name-field"
                    >
                        <Input
                            placeholder="Use case name..."
                            value={useCase.useCaseName}
                            onChange={onUseCaseNameChange}
                            disabled={deploymentAction === DEPLOYMENT_ACTIONS.EDIT}
                            autoComplete={false}
                        />
                    </FormField>

                    <FormField
                        label="Default user email address"
                        info={
                            <InfoLink
                                onFollow={() => setHelpPanelContent(useCaseToolsContent.defaultUserEmail)}
                                ariaLabel={'Use case email address.'}
                            />
                        }
                        description="Optional: the email address of a user you want to give access to this deployment."
                        errorText={defaultUserEmailError}
                        data-testid="user-email-field"
                    >
                        <Input
                            placeholder="placeholder@example.com"
                            value={useCase.defaultUserEmail}
                            onChange={onDefaultUserEmail}
                            type="email"
                            autoComplete={false}
                        />
                    </FormField>
                    <FormField
                        label="Description"
                        errorText={useCaseDescriptionError}
                        data-testid="use-case-description-field"
                        description="Optional: A short description about the intended use of this deployment. Used to help remind others about its purpose on the deployment details page."
                    >
                        <Textarea
                            placeholder="Use case description..."
                            value={useCase.useCaseDescription}
                            onChange={onUseCaseDescriptionChange}
                            rows={8}
                        />
                    </FormField>
                </SpaceBetween>
            </Container>
        </Box>
    );
};

export default UseCase;
