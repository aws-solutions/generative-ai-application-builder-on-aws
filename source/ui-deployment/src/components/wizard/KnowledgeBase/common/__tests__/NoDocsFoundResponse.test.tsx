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

import { screen, cleanup } from '@testing-library/react';
import NoDocsFoundResponse from '../NoDocsFoundResponse';
import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils/test-utils';

describe('NoDocsFoundResponse', () => {
    const defaultProps = {
        noDocsFoundResponse: '',
        'data-testid': 'mock-id',
        ...mockFormComponentCallbacks()
    };

    afterEach(() => {
        cleanup();
        jest.clearAllMocks();
    });

    describe('test cases when noDocsFoundResponse is empty', () => {
        it('renders correctly', () => {
            cloudscapeRender(<NoDocsFoundResponse {...defaultProps} />);
            expect(screen.getByTestId('mock-id-radio-group-form-field')).toBeInTheDocument();

            //should not be visible on initial render
            expect(screen.queryByTestId('mock-id-input-form-field')).not.toBeInTheDocument();
        });

        it('validates various user inputs', () => {
            const { cloudscapeWrapper } = cloudscapeRender(<NoDocsFoundResponse {...defaultProps} />);

            let formFieldWrapper = cloudscapeWrapper?.findFormField('[data-testid="mock-id-radio-group-form-field"]');
            expect(formFieldWrapper).not.toBeNull();
            formFieldWrapper = formFieldWrapper!;

            let radioGroupWrapper = formFieldWrapper?.findControl()?.findRadioGroup();
            expect(radioGroupWrapper).not.toBeNull();
            radioGroupWrapper = radioGroupWrapper!;

            //at this point, the input box formfield should not exist
            expect(screen.queryByTestId('mock-id-input-form-field')).not.toBeInTheDocument();

            //let's now select yes, which should make the formfield visible
            //the default state of the formfield should be in error as we await user input
            radioGroupWrapper.findInputByValue('Yes')?.click();
            expect(screen.getByTestId('mock-id-input-form-field')).toBeInTheDocument();
            expect(formFieldWrapper.findError()).toBeDefined();
        });
    });

    describe('test cases when noDocsFoundResponse is not empty', () => {
        const props = { ...defaultProps, noDocsFoundResponse: 'No references found.' };

        it('renders correctly', () => {
            cloudscapeRender(<NoDocsFoundResponse {...props} />);
            expect(screen.getByTestId('mock-id-radio-group-form-field')).toBeInTheDocument();
            expect(screen.getByTestId('mock-id-input-form-field')).toBeInTheDocument();
        });

        it('validates various user inputs', () => {
            const { cloudscapeWrapper } = cloudscapeRender(<NoDocsFoundResponse {...props} />);

            let inputFormFieldWrapper = cloudscapeWrapper?.findFormField('[data-testid="mock-id-input-form-field"]');
            expect(inputFormFieldWrapper).not.toBeNull();
            inputFormFieldWrapper = inputFormFieldWrapper!;

            let inputWrapper = inputFormFieldWrapper?.findControl()?.findInput();
            expect(inputWrapper).not.toBeNull();
            inputWrapper = inputWrapper!;

            //should be prefilled on initial render with value from props
            expect(inputWrapper.getInputValue()).toEqual(props.noDocsFoundResponse);

            //clear selection and ensure error is visible
            inputWrapper.setInputValue('');
            expect(inputFormFieldWrapper.findError()).toBeDefined();

            let radioGroupFormFieldWrapper = cloudscapeWrapper?.findFormField(
                '[data-testid="mock-id-radio-group-form-field"]'
            );
            expect(radioGroupFormFieldWrapper).not.toBeNull();
            radioGroupFormFieldWrapper = radioGroupFormFieldWrapper!;

            let radioGroupWrapper = radioGroupFormFieldWrapper?.findControl()?.findRadioGroup();
            expect(radioGroupWrapper).not.toBeNull();
            radioGroupWrapper = radioGroupWrapper!;

            //let's now select no, which should make the formfield disappear
            //and any existing errors should be cleared
            radioGroupWrapper.findInputByValue('No')?.click();
            expect(screen.queryByTestId('mock-id-input-form-field')).not.toBeInTheDocument();
        });
    });
});
