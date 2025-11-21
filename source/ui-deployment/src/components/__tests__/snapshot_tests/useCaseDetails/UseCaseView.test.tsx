// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@testing-library/jest-dom';
import { Dispatch } from 'react';
import { ActionType } from '../../../../hooks/useCreateReducer';
import { HomeInitialState } from '../../../../contexts/home.state';
import UseCaseView from '../../../useCaseDetails/UseCaseView';

// eslint-disable-next-line jest/no-mocks-import
import mockContext from '../../__mocks__/mock-context.json';
import { snapshotWithProvider } from '@/utils';

vi.mock('@cloudscape-design/components');

const contextValue = {
    dispatch: vi.fn() as Dispatch<ActionType<HomeInitialState>>,
    state: mockContext
};

test('Snapshot test', async () => {
    const tree = snapshotWithProvider(<UseCaseView />, '/deployment-details', contextValue).toJSON();
    expect(tree).toMatchSnapshot();
});
