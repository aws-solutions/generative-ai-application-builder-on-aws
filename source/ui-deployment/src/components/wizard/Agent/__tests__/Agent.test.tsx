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

import { mockFormComponentCallbacks, mockModelNamesQuery, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import Agent from '../Agent';
import { sampleDeployUseCaseFormData } from '@/components/__tests__/__mocks__/deployment-steps-form-data';

describe('Agent', () => {
    describe('test that all components are rendered in a success state', () => {
        beforeEach(() => {
            renderWithProvider(<Agent info={sampleDeployUseCaseFormData} {...mockFormComponentCallbacks()} />, {
                route: '/wizardView'
            });
        });

        afterEach(() => {
            vi.clearAllMocks();
        });

        test('renders', async () => {
            expect(screen.getByTestId('agent-step-container')).toBeDefined();
            expect(screen.getByTestId('agent-step-secure-agent-alert')).toBeDefined();
        });
    });
});
