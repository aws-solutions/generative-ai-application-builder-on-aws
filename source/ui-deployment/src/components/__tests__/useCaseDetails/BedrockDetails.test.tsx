/* eslint-disable import/first */
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

import { Dispatch } from 'react';

import '@testing-library/jest-dom';
import { cleanup, screen } from '@testing-library/react';
import { HomeInitialState } from '../../../contexts/home.state';
import { ActionType } from '../../../hooks/useCreateReducer';
import { BedrockDetails } from '@/components/useCaseDetails/BedrockDetails';

import { baseMock } from '../__mocks__/mock-context-variants.js';

import { mockReactMarkdown, renderWithProvider } from '@/utils';

describe('UseCaseView', () => {
    let WizardView: any;
    const contextValue = {
        dispatch: vi.fn() as Dispatch<ActionType<HomeInitialState>>,
        state: baseMock
    };

    beforeAll(async () => {
        mockReactMarkdown();
        WizardView = (await import('../../wizard/WizardView')).default;
    });

    afterEach(() => {
        cleanup();
    });

    test('The initial state is correct', async () => {
        renderWithProvider(<BedrockDetails />, { route: '/deployment-details' });

        const element = screen.getByTestId('bedrock-details-container');
        expect(element).toBeDefined();
    });
});
