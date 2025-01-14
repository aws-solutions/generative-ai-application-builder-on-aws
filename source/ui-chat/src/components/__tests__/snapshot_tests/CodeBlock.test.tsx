// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@testing-library/jest-dom';
import renderer from 'react-test-renderer';
import { CodeBlock } from '../../CodeBlock';

jest.mock('@cloudscape-design/components', () => {
    const Components = jest.genMockFromModule('@cloudscape-design/components') as any;
    for (const componentName of Object.keys(Components)) {
        Components[componentName] = componentName;
    }
    return Components;
});

const code = `public static void towerOfHanoi(int n, char fromRod,
    char toRod, char auxRod) {
        if (n == 1) {
            System.out.println("Move disk 1 from rod " + 
                fromRod + " to rod " + toRod);
            return;
        }
        towerOfHanoi(n-1, fromRod, auxRod, toRod);
        System.out.println("Move disk " + n + " from rod " +
            fromRod + " to rod " + toRod);
        towerOfHanoi(n-1, auxRod, toRod, fromRod);
    }`;

describe('CodeBlock', () => {
    test('Snapshot test for code block', async () => {
        const tree = renderer.create(<CodeBlock key={Math.random()} language={'java'} value={code} />).toJSON();
        expect(tree).toMatchSnapshot();
    });
});
