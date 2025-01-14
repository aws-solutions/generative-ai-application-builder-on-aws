// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
