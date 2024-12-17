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
import { MODEL_PROVIDER_NAME_MAP } from '@/components/wizard/steps-config';
import { StreamingToggle } from '../StreamingToggle';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import * as queryHooks from 'hooks/useQueries';
import { UseQueryResult } from '@tanstack/react-query';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

describe('StreamingToggle', () => {
    const mockHandleWizardNextStepLoading = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const mockModelData = {
        modelName: 'amazon.titan-text-express-v1',
        streaming: true,
        modelProvider: { label: MODEL_PROVIDER_NAME_MAP.Bedrock, value: MODEL_PROVIDER_NAME_MAP.Bedrock }
    };

    test('shows loading spinner and updates wizard loading state when query is pending', () => {
        jest.spyOn(queryHooks, 'useModelStreamingQuery').mockImplementation(
            () =>
                ({
                    isPending: true,
                    isSuccess: false
                } as UseQueryResult)
        );

        const callbacks = mockFormComponentCallbacks();
        renderWithProvider(
            <StreamingToggle
                modelData={mockModelData}
                modelName={mockModelData.modelName}
                modelProvider={mockModelData.modelProvider}
                handleWizardNextStepLoading={mockHandleWizardNextStepLoading}
                {...callbacks}
            />,
            {
                route: USECASE_TYPE_ROUTE.TEXT
            }
        );

        expect(screen.queryByTestId('model-streaming-toggle')).not.toBeInTheDocument();
        // Verify wizard loading state is updated
        expect(mockHandleWizardNextStepLoading).toHaveBeenCalledWith(true);
    });

    test('renders toggle and updates wizard loading state when query succeeds', () => {
        jest.spyOn(queryHooks, 'useModelStreamingQuery').mockImplementation(
            () =>
                ({
                    isPending: false,
                    isSuccess: true,
                    data: true
                } as UseQueryResult)
        );

        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = renderWithProvider(
            <StreamingToggle
                modelData={mockModelData}
                modelName={mockModelData.modelName}
                modelProvider={mockModelData.modelProvider}
                handleWizardNextStepLoading={mockHandleWizardNextStepLoading}
                {...callbacks}
            />,
            {
                route: USECASE_TYPE_ROUTE.TEXT
            }
        );

        // Verify toggle is shown
        const element = screen.getByTestId('model-streaming-toggle');
        expect(element).toBeInTheDocument();
        expect(mockHandleWizardNextStepLoading).toHaveBeenCalledWith(false);

        // Test toggle interaction
        const toggle = cloudscapeWrapper.findToggle('[data-testid="model-streaming-toggle"]')?.findNativeInput();
        toggle?.click();
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            streaming: false
        });
    });
});
