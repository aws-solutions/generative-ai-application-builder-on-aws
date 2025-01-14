// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import Kendra from '../Kendra';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { DEPLOYMENT_ACTIONS, USECASE_TYPE_ROUTE } from '@/utils/constants';
import { screen } from '@testing-library/react';

describe('Kendra', () => {
    test('renders on default state', () => {
        const mockKnowledgeBaseData = {
            existingKendraIndex: 'No',
            knowledgeBaseType: {
                value: 'Kendra',
                label: 'Kendra'
            }
        };
        renderWithProvider(<Kendra knowledgeBaseData={mockKnowledgeBaseData} {...mockFormComponentCallbacks()} />, {
            route: USECASE_TYPE_ROUTE.TEXT
        });
        expect(screen.getByTestId('kendra-container')).toBeDefined();
        expect(screen.getByTestId('existing-kendra-index-select')).toBeDefined();
        expect(screen.getByTestId('input-kendra-index-name')).toBeDefined();
        expect(screen.getByTestId('kendra-resource-retention-alert')).toBeDefined();
        expect(screen.getByTestId('additional-kendra-options')).toBeDefined();
    });

    test('renders on state to show kendra config', () => {
        const mockKnowledgeBaseData = {
            existingKendraIndex: 'Yes',
            knowledgeBaseType: {
                value: 'Kendra',
                label: 'Kendra'
            }
        };
        renderWithProvider(<Kendra knowledgeBaseData={mockKnowledgeBaseData} {...mockFormComponentCallbacks()} />, {
            route: USECASE_TYPE_ROUTE.TEXT
        });
        expect(screen.getByTestId('kendra-container')).toBeDefined();
        expect(screen.getByTestId('existing-kendra-index-select')).toBeDefined();
        expect(screen.getByTestId('input-kendra-index-id')).toBeDefined();
    });

    test('does not render the option to create a new index on Edit', () => {
        const mockKnowledgeBaseData = {
            existingKendraIndex: 'No',
            knowledgeBaseType: {
                value: 'Kendra',
                label: 'Kendra'
            }
        };
        renderWithProvider(<Kendra knowledgeBaseData={mockKnowledgeBaseData} {...mockFormComponentCallbacks()} />, {
            route: USECASE_TYPE_ROUTE.TEXT,
            customState: {
                deploymentAction: DEPLOYMENT_ACTIONS.EDIT
            }
        });

        //customer should not see the create new index option on Edit
        expect(screen.queryByTestId('existing-kendra-index-select')).toBeNull();

        //customer should be forced to provide an existing kendra index ID
        expect(screen.getByTestId('kendra-container')).toBeDefined();
        expect(screen.getByTestId('input-kendra-index-id')).toBeDefined();
    });
});
