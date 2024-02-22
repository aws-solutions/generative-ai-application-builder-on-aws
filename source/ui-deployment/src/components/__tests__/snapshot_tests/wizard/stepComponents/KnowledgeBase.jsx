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

import '@testing-library/jest-dom';
import renderer from 'react-test-renderer';
import HomeContext from '../../../../../contexts/home.context';
import KnowledgeBase from '@/components/wizard/KnowledgeBase';
import { DEFAULT_STEP_INFO } from '../../../../wizard/steps-config';

jest.mock('@cloudscape-design/components', () => {
    const Components = jest.genMockFromModule('@cloudscape-design/components');
    for (const componentName of Object.keys(Components)) {
        Components[componentName] = componentName;
    }
    return Components;
});

describe('Chat', () => {
    const contextValue = {
        'dispatch': jest.fn(),
        'state': {
            'selectedDeployment': {},
            'deploymentsData': [],
            'deploymentAction': 'CREATE',
            'authorized': true
        }
    };

    test('Snapshot test for wizard step 3', async () => {
        const tree = renderer
            .create(
                <>
                    <HomeContext.Provider
                        value={{
                            ...contextValue
                        }}
                    >
                        <KnowledgeBase info={DEFAULT_STEP_INFO} onChange={jest.fn()} setHelpPanelContent={jest.fn()} />
                    </HomeContext.Provider>
                </>
            )
            .toJSON();
        expect(tree).toMatchSnapshot();
    });
});
