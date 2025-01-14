/* eslint-disable import/first */
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Dispatch } from 'react';

import '@testing-library/jest-dom';
import { cleanup, screen } from '@testing-library/react';
import { HomeInitialState } from '../../../contexts/home.state';
import { ActionType } from '../../../hooks/useCreateReducer';
import { SageMakerDetails } from '@/components/useCaseDetails/SageMakerDetails';

import { baseMock, selectedSageMakerProvider } from '../__mocks__/mock-context-variants.js';

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
        renderWithProvider(<SageMakerDetails />, {
            customState: selectedSageMakerProvider,
            route: '/deployment-details'
        });

        const element = screen.getByTestId('sagemaker-details-container');
        expect(element).toBeDefined();
    });
});
