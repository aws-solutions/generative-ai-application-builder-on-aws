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
 *********************************************************************************************************************/

import '@testing-library/jest-dom';
import { Dispatch } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import renderer from 'react-test-renderer';
import HomeContext from '../../../../home/home.context';
import { ActionType } from '../../../../hooks/useCreateReducer';
import { HomeInitialState } from '../../../../home/home.state';
import DashboardView from '../../../dashboard/DashboardView';

// eslint-disable-next-line jest/no-mocks-import
import mockContext from '../../__mocks__/mock-context.json';

jest.mock('@cloudscape-design/components', () => {
    const Components = jest.genMockFromModule('@cloudscape-design/components') as any;
    for (const componentName of Object.keys(Components)) {
        Components[componentName] = componentName;
    }
    return Components;
});

const contextValue = {
    dispatch: jest.fn() as Dispatch<ActionType<HomeInitialState>>,
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
