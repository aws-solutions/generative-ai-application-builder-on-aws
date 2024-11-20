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
import HomeContext from '../../../../contexts/home.context';
import { ActionType } from '../../../../hooks/useCreateReducer';
import { HomeInitialState } from '../../../../contexts/home.state';
import { mockReactMarkdown } from '@/utils';
import { TextUseCaseType } from '@/components/wizard/interfaces/UseCaseTypes/Text';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

vi.mock('@cloudscape-design/components');

const contextValue = {
    'dispatch': vi.fn() as Dispatch<ActionType<HomeInitialState>>,
    'state': {
        'selectedDeployment': {},
        'deploymentsData': [],
        'deploymentAction': 'CREATE',
        'authorized': true
    }
};

let WizardView: any;
mockReactMarkdown();
WizardView = (await import('../../../wizard/WizardView')).default;

test('Snapshot test', async () => {
    const tree = renderer
        .create(
            <>
                <HomeContext.Provider
                    value={{
                        ...contextValue
                    }}
                >
                    <MemoryRouter initialEntries={[USECASE_TYPE_ROUTE.TEXT]}>
                        <Routes>
                            <Route
                                path={USECASE_TYPE_ROUTE.TEXT}
                                element={<WizardView useCase={new TextUseCaseType()} />}
                            />
                        </Routes>
                    </MemoryRouter>
                </HomeContext.Provider>
            </>
        )
        .toJSON();
    expect(tree).toMatchSnapshot();
});
