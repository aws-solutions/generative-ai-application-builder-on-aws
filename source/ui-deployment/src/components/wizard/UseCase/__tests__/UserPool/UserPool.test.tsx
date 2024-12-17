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
import { screen } from '@testing-library/react';
import { UserPool } from '../../UserPool/UserPool';
import '@testing-library/jest-dom';
import { cloudscapeRender } from '@/utils';

describe('UserPool Component', () => {
    const defaultProps = {
        useExistingUserPool: false,
        existingUserPoolId: '',
        useExistingUserPoolClient: false,
        existingUserPoolClientId: '',
        disabled: false,
        onChangeFn: jest.fn(),
        setNumFieldsInError: jest.fn(),
        setHelpPanelContent: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render with with alerts', () => {
            const { cloudscapeWrapper } = cloudscapeRender(<UserPool {...defaultProps} />);
            expect(screen.getByTestId('userpool-header')).toBeInTheDocument();

            expect(screen.getByTestId('existing-userpool-alert')).toBeInTheDocument();
            const wrapper = cloudscapeWrapper.findAlert();
            expect(wrapper?.findContent().getElement().textContent).toContain(
                'If providing an existing user pool, please note:The admin user of this deployment dashboard will not have access to the use case if the Amazon Cognito user pool provided is different from the deployment dashboard’s user pool.Update Allowed callback URLs and Allowed sign-out URLs under App clients --> Login Pages with the Amazon CloudFront URLs for this use case once it is deployed. See the App client terms for more information.'
            );
        });
    });
});
