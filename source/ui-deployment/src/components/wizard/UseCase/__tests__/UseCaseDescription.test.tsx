// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import UseCaseDescription from '../UseCaseDescription';
import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils';
import { screen, fireEvent } from '@testing-library/react';
import { MAX_USE_CASE_DESCRIPTION_LENGTH } from '../../../../utils/constants';

describe('UseCaseDescription', () => {
    const mockSetNumFieldsInError = jest.fn();
    const mockOnChangeFn = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should render', () => {
        const { cloudscapeWrapper } = cloudscapeRender(
            <UseCaseDescription descriptionValue="fake-description" {...mockFormComponentCallbacks()} />
        );
        const element = screen.getByTestId('use-case-description-field');
        expect(element).toBeDefined();
        expect(cloudscapeWrapper.findTextarea()?.getTextareaValue()).toEqual('fake-description');
    });

    test('should show error when description exceeds maximum length', () => {
        const longDescription = 'a'.repeat(MAX_USE_CASE_DESCRIPTION_LENGTH + 1);
        const { cloudscapeWrapper } = cloudscapeRender(
            <UseCaseDescription
                descriptionValue=""
                onChangeFn={mockOnChangeFn}
                setNumFieldsInError={mockSetNumFieldsInError}
            />
        );

        const textarea = cloudscapeWrapper.findTextarea();
        textarea!.setTextareaValue(longDescription);

        expect(cloudscapeWrapper.findFormField()?.findError()?.getElement()).toHaveTextContent(
            `Description exceeds maximum length of ${MAX_USE_CASE_DESCRIPTION_LENGTH} characters.`
        );
        expect(mockSetNumFieldsInError).toHaveBeenCalled();
    });

    test('should show error when description contains invalid characters', () => {
        const invalidDescription = 'test description with invalid chars `[]';
        const { cloudscapeWrapper } = cloudscapeRender(
            <UseCaseDescription
                descriptionValue=""
                onChangeFn={mockOnChangeFn}
                setNumFieldsInError={mockSetNumFieldsInError}
            />
        );

        const textarea = cloudscapeWrapper.findTextarea();
        textarea!.setTextareaValue(invalidDescription);

        expect(cloudscapeWrapper.findFormField()?.findError()?.getElement()).toHaveTextContent(
            'Can only include alphanumeric characters, -, _, +, :, and spaces.'
        );
        expect(mockSetNumFieldsInError).toHaveBeenCalled();
    });

    test('should show error when description starts with a number', () => {
        const numberStartDescription = '123 test description';
        const { cloudscapeWrapper } = cloudscapeRender(
            <UseCaseDescription
                descriptionValue=""
                onChangeFn={mockOnChangeFn}
                setNumFieldsInError={mockSetNumFieldsInError}
            />
        );

        const textarea = cloudscapeWrapper.findTextarea();
        textarea!.setTextareaValue(numberStartDescription);

        expect(cloudscapeWrapper.findFormField()?.findError()?.getElement()).toHaveTextContent(
            'First character must be a letter.'
        );
        expect(mockSetNumFieldsInError).toHaveBeenCalled();
    });

    test('should accept valid description with allowed special characters', () => {
        const validDescription = 'Valid description with allowed chars: -_+:."\'{}\\n\\r\\t,;/\\*&%$#@!()=+~^|<>?';
        const { cloudscapeWrapper } = cloudscapeRender(
            <UseCaseDescription
                descriptionValue=""
                onChangeFn={mockOnChangeFn}
                setNumFieldsInError={mockSetNumFieldsInError}
            />
        );

        const textarea = cloudscapeWrapper.findTextarea();
        textarea!.setTextareaValue(validDescription);

        expect(cloudscapeWrapper.findFormField()?.findError()).toBeNull();
        expect(mockOnChangeFn).toHaveBeenCalledWith({ useCaseDescription: validDescription });
    });

    test('should accept description at maximum length', () => {
        const maxLengthDescription = 'a'.repeat(MAX_USE_CASE_DESCRIPTION_LENGTH);
        const { cloudscapeWrapper } = cloudscapeRender(
            <UseCaseDescription
                descriptionValue=""
                onChangeFn={mockOnChangeFn}
                setNumFieldsInError={mockSetNumFieldsInError}
            />
        );

        const textarea = cloudscapeWrapper.findTextarea();
        textarea!.setTextareaValue(maxLengthDescription);

        expect(cloudscapeWrapper.findFormField()?.findError()).toBeNull();
        expect(mockOnChangeFn).toHaveBeenCalledWith({ useCaseDescription: maxLengthDescription });
    });

    test('should accept empty description', () => {
        const { cloudscapeWrapper } = cloudscapeRender(
            <UseCaseDescription
                descriptionValue=""
                onChangeFn={mockOnChangeFn}
                setNumFieldsInError={mockSetNumFieldsInError}
            />
        );

        const textarea = cloudscapeWrapper.findTextarea();
        textarea!.setTextareaValue('');

        expect(cloudscapeWrapper.findFormField()?.findError()).toBeNull();
        expect(mockOnChangeFn).toHaveBeenCalledWith({ useCaseDescription: '' });
    });
});
