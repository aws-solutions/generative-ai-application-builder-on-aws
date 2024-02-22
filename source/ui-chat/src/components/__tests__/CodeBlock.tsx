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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeBlock } from '../CodeBlock';

jest.mock('react-markdown', () => (props) => {
    return <>{props.children}</>;
});

jest.mock('remark-gfm', () => (props) => {
    return <>{props.children}</>;
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

describe('Chat', () => {
    test('The initial state is correct', async () => {
        // const copy = jest.spyOn(CodeBlock.prototype, 'copyToClipboard');
        const user = userEvent.setup();
        render(<CodeBlock key={Math.random()} language={'java'} value={code} />);
        const copyMsgButton = screen.getByTestId('codeblock-button-copy');
        await user.click(copyMsgButton);
        const clipboardText = await navigator.clipboard.readText();
        expect(clipboardText).toBe(code);
    });
});
