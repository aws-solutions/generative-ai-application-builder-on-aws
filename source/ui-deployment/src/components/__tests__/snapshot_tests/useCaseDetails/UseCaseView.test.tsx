// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@testing-library/jest-dom';
import { Dispatch } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import renderer from 'react-test-renderer';
import HomeContext from '../../../../contexts/home.context';
import { ActionType } from '../../../../hooks/useCreateReducer';
import { HomeInitialState } from '../../../../contexts/home.state';
import UseCaseView from '../../../useCaseDetails/UseCaseView';

// eslint-disable-next-line jest/no-mocks-import
import mockContext from '../../__mocks__/mock-context.json';

vi.mock('@cloudscape-design/components');

const contextValue = {
    dispatch: jest.fn() as Dispatch<ActionType<HomeInitialState>>,
    state: mockContext
};

test('Snapshot test', async () => {
    const tree = renderer
        .create(
            <>
                <HomeContext.Provider
                    value={{
                        ...contextValue
                    }}
                >
                    <MemoryRouter initialEntries={['/deployment-details']}>
                        <Routes>
                            <Route path="/deployment-details" element={<UseCaseView />} />
                        </Routes>
                    </MemoryRouter>
                </HomeContext.Provider>
            </>
        )
        .toJSON();
    expect(tree).toMatchSnapshot();
});
