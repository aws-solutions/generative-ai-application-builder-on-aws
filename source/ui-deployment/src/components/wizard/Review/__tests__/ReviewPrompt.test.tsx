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

import ReviewPrompt, { ReviewPromptProps } from '../ReviewPrompt';
import { renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import * as QueryHooks from 'hooks/useQueries';

describe('ReviewPrompt', () => {
    test('should render when prompt is valid for non-rag config', () => {
        jest.spyOn(QueryHooks, 'useModelInfoQuery').mockReturnValue({
            isSuccess: true,
            isError: false
        } as any);

        const testProps: ReviewPromptProps = {
            promptTemplate: '{history}\n\n{input}',
            modelProvider: 'Bedrock',
            modelName: 'amazon.titan-text-express-v1',
            isRagEnabled: false
        };

        const { cloudscapeWrapper } = renderWithProvider(<ReviewPrompt {...testProps} />, { route: '/wizard' });
        expect(screen.getByTestId('review-system-prompt')).toBeDefined();
        expect(cloudscapeWrapper.getElement().textContent).toContain('{history}{input}');
    });

    test('should render when prompt is valid for rag config', () => {
        jest.spyOn(QueryHooks, 'useModelInfoQuery').mockReturnValue({
            isSuccess: true,
            isError: false
        } as any);

        const testProps: ReviewPromptProps = {
            promptTemplate: '{context}\n\n{history}\n\n{input}',
            modelProvider: 'Bedrock',
            modelName: 'amazon.titan-text-express-v1',
            isRagEnabled: true
        };

        const { cloudscapeWrapper } = renderWithProvider(<ReviewPrompt {...testProps} />, { route: '/wizard' });
        expect(screen.getByTestId('review-system-prompt')).toBeDefined();
        expect(cloudscapeWrapper.getElement().textContent).toContain('{context}{history}{input}');
    });

    test('should render when prompt is invalid for rag config', () => {
        jest.spyOn(QueryHooks, 'useModelInfoQuery').mockReturnValue({
            isSuccess: true,
            isError: false
        } as any);

        const testProps: ReviewPromptProps = {
            promptTemplate: '{history}\n\n{input}',
            modelProvider: 'Bedrock',
            modelName: 'amazon.titan-text-express-v1',
            isRagEnabled: true
        };

        renderWithProvider(<ReviewPrompt {...testProps} />, { route: '/wizard' });
        expect(screen.getByTestId('invalid-prompt-alert')).toBeDefined();
    });

    test('should render when prompt is invalid for non-rag config', () => {
        jest.spyOn(QueryHooks, 'useModelInfoQuery').mockReturnValue({
            isSuccess: true,
            isError: false
        } as any);

        const testProps: ReviewPromptProps = {
            promptTemplate: '{input}',
            modelProvider: 'Bedrock',
            modelName: 'amazon.titan-text-express-v1',
            isRagEnabled: false
        };

        renderWithProvider(<ReviewPrompt {...testProps} />, { route: '/wizard' });
        expect(screen.getByTestId('invalid-prompt-alert')).toBeDefined();
    });

    test('should display spinner if query is pending', () => {
        jest.spyOn(QueryHooks, 'useModelInfoQuery').mockReturnValue({
            isPending: true
        } as any);

        const testProps: ReviewPromptProps = {
            promptTemplate: '{input}',
            modelProvider: 'Bedrock',
            modelName: 'amazon.titan-text-express-v1',
            isRagEnabled: false
        };

        renderWithProvider(<ReviewPrompt {...testProps} />, { route: '/wizard' });
        expect(screen.getByTestId('review-prompt-pending-spinner')).toBeDefined();
    });

    test('should fetch and render prompt if input system prompt is empty', () => {
        jest.spyOn(QueryHooks, 'useModelInfoQuery').mockReturnValue({
            isSuccess: true,
            isError: false,
            data: { Prompt: '{history}\n\n{input}' }
        } as any);

        const testProps: ReviewPromptProps = {
            promptTemplate: '',
            modelProvider: 'Bedrock',
            modelName: 'amazon.titan-text-express-v1',
            isRagEnabled: false
        };

        const { cloudscapeWrapper } = renderWithProvider(<ReviewPrompt {...testProps} />, { route: '/wizard' });
        expect(screen.getByTestId('review-system-prompt')).toBeDefined();
        expect(cloudscapeWrapper.getElement().textContent).toContain('{history}{input}');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });
});
