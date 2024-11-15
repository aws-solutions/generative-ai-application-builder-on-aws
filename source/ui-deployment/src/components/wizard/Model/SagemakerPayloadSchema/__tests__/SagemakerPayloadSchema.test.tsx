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

import { cloudscapeRender, mockFormComponentCallbacks, mockReactMarkdown } from '@/utils';
import { screen } from '@testing-library/react';

let SagemakerPayloadSchema: any;

describe('SagemakerPayloadSchema', () => {
    beforeEach(async () => {
        mockReactMarkdown();

        SagemakerPayloadSchema = (await import('../SagemakerPayloadSchema')).default;
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    it('renders', () => {
        const mockModelData = { sagemakerInputSchema: '' };
        cloudscapeRender(<SagemakerPayloadSchema {...mockFormComponentCallbacks()} modelData={mockModelData} />);
        expect(screen.getByTestId('sagemaker-payload-schema-components')).toBeDefined();
        expect(screen.getByTestId('sagemaker-input-payload-schema-field')).toBeDefined();
        expect(screen.getByTestId('sagemaker-input-payload-rendered-field')).toBeDefined();
        expect(screen.getByTestId('output-path-schema-field')).toBeDefined();
    });
});
