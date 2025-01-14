// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@testing-library/jest-dom';
import renderer from 'react-test-renderer';
import HomeContext from '../../../../../contexts/home.context';
import KnowledgeBase from '@/components/wizard/KnowledgeBase';
import { DEFAULT_STEP_INFO } from '../../../../wizard/steps-config';

vi.mock('@cloudscape-design/components');

describe('Chat', () => {
    const contextValue = {
        'dispatch': vi.fn(),
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
                        <KnowledgeBase info={DEFAULT_STEP_INFO} onChange={vi.fn()} setHelpPanelContent={jest.fn()} />
                    </HomeContext.Provider>
                </>
            )
            .toJSON();
        expect(tree).toMatchSnapshot();
    });
});
