// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@testing-library/jest-dom';
import { Dispatch } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import renderer from 'react-test-renderer';
import HomeContext from '../../../../contexts/home.context';
import { ActionType } from '../../../../hooks/useCreateReducer';
import { HomeInitialState } from '../../../../contexts/home.state';
import DashboardView from '../../../dashboard/DashboardView';

// eslint-disable-next-line jest/no-mocks-import
import mockContext from '../../__mocks__/mock-context.json';

vi.mock('@cloudscape-design/components');

const contextValue = {
    dispatch: vi.fn() as Dispatch<ActionType<HomeInitialState>>,
    state: mockContext
};

test('Snapshot test for Dashboard', async () => {
    const tree = renderer
        .create(
            <>
                <HomeContext.Provider
                    value={{
                        ...contextValue
                    }}
                >
                    <MemoryRouter initialEntries={['//']}>
                        <Routes>
                            <Route path="/" element={<DashboardView />} />
                        </Routes>
                    </MemoryRouter>
                </HomeContext.Provider>
            </>
        )
        .toJSON();
    expect(tree).toMatchSnapshot();
});
