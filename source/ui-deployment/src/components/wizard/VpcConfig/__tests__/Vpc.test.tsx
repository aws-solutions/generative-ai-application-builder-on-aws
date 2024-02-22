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

import Vpc from '../Vpc';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';

describe('Vpc', () => {
    test('renders', () => {
        const mockVpcData = {
            info: {
                vpc: {
                    isVpcRequired: true,
                    existingVpc: false
                }
            }
        };

        const callbacks = mockFormComponentCallbacks();
        renderWithProvider(<Vpc {...mockVpcData} {...callbacks} />, { route: '/vpc' });

        expect(screen.getByTestId('deploy-in-vpc-field')).toBeDefined();
        expect(screen.getByTestId('use-existing-vpc-field')).toBeDefined();
    });
});
