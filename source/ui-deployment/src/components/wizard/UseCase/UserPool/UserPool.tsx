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

import { Alert, Box, Header, Link, SpaceBetween } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../../interfaces';
import ExistingUserPoolClientId from './ExistingUserPoolClientId';
import ExistingUserPoolId from './ExistingUserPoolId';
import UseExistingUserPoolClient from './UseExistingUserPoolClient';
import UseExistingUserPool from './UseExistingUserPool';

export interface UserPoolFieldProps extends BaseFormComponentProps {
    useExistingUserPool: boolean;
    existingUserPoolId: string;
    useExistingUserPoolClient: boolean;
    existingUserPoolClientId: string;
    disabled?: boolean;
}

/**
 * Validate user pool id based on:
 * https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_UserPoolType.html
 * @param userPoolId user pool id string
 * @returns
 */
export const isUserPoolIdValid = (userPoolId: string) => {
    if (userPoolId === '') {
        return false;
    }

    return userPoolId.match('^[\\w-]+_[0-9a-zA-Z]+$') !== null && userPoolId.length >= 1 && userPoolId.length <= 55;
};

/**
 * Validate user pool client id based on:
 * https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_UserPoolClientType.html
 * @param userPoolClientId user pool id string
 * @returns
 */
export const isUserPoolClientIdValid = (userPoolClientId: string) => {
    if (userPoolClientId === '') {
        return false;
    }

    return (
        userPoolClientId.match('^[\\w+]+') !== null && userPoolClientId.length >= 1 && userPoolClientId.length <= 128
    );
};

export const UserPool = (props: UserPoolFieldProps) => {
    return (
        <Box margin={{ bottom: 'l' }}>
            <Header data-testid="userpool-header" variant="h3">
                User Pool Configuration
            </Header>
            <Alert data-testid="existing-userpool-alert">
                If providing an existing user pool, please note:
                <ul>
                    <li>
                        The admin user of this deployment dashboard will not have access to the use case if the Amazon
                        Cognito user pool provided is different from the deployment dashboard’s user pool.
                    </li>
                    <li>
                        Update <code>Allowed callback URLs</code> and <code>Allowed sign-out URLs</code> under{' '}
                        <b>App clients --{'>'} Login Pages</b> with the Amazon CloudFront URLs for this use case once it
                        is deployed. See the{' '}
                        <Link
                            external={false}
                            href={`https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html#cognito-user-pools-app-idp-settings-about`}
                            target="_blank"
                            data-testid="app-client-docs-link"
                        >
                            App client terms
                        </Link>{' '}
                        for more information.
                    </li>
                </ul>
            </Alert>

            {props.disabled && (
                <Box variant="p" margin={{ 'bottom': 'l' }}>
                    <Alert statusIconAriaLabel="warning" type="warning" data-testid="user-pool-locked-warning">
                        User Pool Settings cannot be modified for the deployed Use Case.
                    </Alert>
                </Box>
            )}

            <SpaceBetween size="l">
                <UseExistingUserPool {...props} />

                {props.useExistingUserPool && (
                    <>
                        <ExistingUserPoolId {...props} />
                        <UseExistingUserPoolClient {...props} />

                        {props.useExistingUserPoolClient && <ExistingUserPoolClientId {...props} />}
                    </>
                )}
            </SpaceBetween>
        </Box>
    );
};

export default UserPool;
