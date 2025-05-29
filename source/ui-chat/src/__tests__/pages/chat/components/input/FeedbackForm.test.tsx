// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import { FeedbackForm } from '@/pages/chat/components/input/FeedbackForm';
import { MAX_FEEDBACK_INPUT_LENGTH } from '@/utils';

describe('FeedbackForm', () => {
    const mockOnSubmit = vi.fn();
    const mockOnCancel = vi.fn();

    const defaultProps = {
        onSubmit: mockOnSubmit,
        onCancel: mockOnCancel,
        feedbackType: 'not-helpful' as const,
        isLoading: false
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders with all required elements', () => {
        render(<FeedbackForm {...defaultProps} />);

        expect(screen.getByTestId('feedback-form')).toBeDefined();

        // Check for form fields
        expect(screen.getByTestId('feedback-form-comment-field')).toBeInTheDocument();
        expect(screen.getByTestId('feedback-form-reasons-field')).toBeInTheDocument();

        // Check for buttons
        expect(screen.getByTestId('feedback-form-buttons')).toBeInTheDocument();
    });

    it('handles comment input correctly', async () => {
        const { container } = render(<FeedbackForm {...defaultProps} />);
        const wrapper = createWrapper(container);
        const user = userEvent.setup();

        const commentInput = wrapper.findInput()!.findNativeInput();
        await user.type(commentInput.getElement(), 'This is a test comment');

        expect(commentInput.getElement()).toHaveValue('This is a test comment');
    });

    it('handles checkbox selection correctly', async () => {
        const { container } = render(<FeedbackForm {...defaultProps} />);
        const wrapper = createWrapper(container);
        const user = userEvent.setup();

        // Find checkboxes by test IDs
        const inaccurateCheckbox = wrapper.findCheckbox('[data-testid="feedback-form-reason-checkbox-Inaccurate"]');
        const harmfulCheckbox = wrapper.findCheckbox('[data-testid="feedback-form-reason-checkbox-Harmful"]');

        inaccurateCheckbox!.findNativeInput().click();
        harmfulCheckbox!.findNativeInput().click();

        // Verify selections
        expect(inaccurateCheckbox!.findNativeInput().getElement()).toBeChecked();
        expect(harmfulCheckbox!.findNativeInput().getElement()).toBeChecked();
        expect(screen.getByTestId('feedback-form-reason-checkbox-Incomplete or insufficient')).not.toBeChecked();
        expect(screen.getByTestId('feedback-form-reason-checkbox-Other')).not.toBeChecked();
    });

    it('submits form with correct data', async () => {
        const { container } = render(<FeedbackForm {...defaultProps} />);
        const wrapper = createWrapper(container);
        const user = userEvent.setup();

        // Enter comment using test ID
        const commentInput = wrapper.findInput()!.findNativeInput();
        await user.type(commentInput.getElement(), 'Test feedback');

        // Select reasons using test IDs
        const inaccurateCheckbox = wrapper.findCheckbox('[data-testid="feedback-form-reason-checkbox-Inaccurate"]');
        const otherCheckbox = wrapper.findCheckbox('[data-testid="feedback-form-reason-checkbox-Other"]');
        inaccurateCheckbox!.findNativeInput().click();
        otherCheckbox!.findNativeInput().click();

        // Submit form using test ID
        const submitButton = wrapper.findButton('[data-testid="feedback-form-submit-button"]')!;
        await user.click(submitButton.getElement());

        // Verify submission
        expect(mockOnSubmit).toHaveBeenCalledWith({
            comment: 'Test feedback',
            reasons: ['Inaccurate', 'Other']
        });
    });

    it('calls onCancel when cancel button is clicked', async () => {
        render(<FeedbackForm {...defaultProps} />);
        const user = userEvent.setup();

        const cancelButton = screen.getByTestId('feedback-form-cancel-button');
        await user.click(cancelButton);

        expect(mockOnCancel).toHaveBeenCalled();
    });

    it('disables buttons when isLoading is true', () => {
        const { container } = render(<FeedbackForm {...defaultProps} isLoading={true} />);
        const wrapper = createWrapper(container);

        const submitButton = wrapper.findButton('[data-testid="feedback-form-submit-button"]');
        const cancelButton = wrapper.findButton('[data-testid="feedback-form-cancel-button"]');

        expect(submitButton?.isDisabled).toBeTruthy();
        expect(cancelButton?.isDisabled).toBeTruthy();
    });

    it('shows loading state on submit button when isLoading is true', () => {
        render(<FeedbackForm {...defaultProps} isLoading={true} />);
        const wrapper = createWrapper(document.body);

        const submitButton = wrapper.findButton('[data-testid="feedback-form-submit-button"]')!;
        expect(submitButton.findLoadingIndicator()).not.toBeNull();
    });

    it('uses different placeholder text based on feedbackType', () => {
        // Test with 'helpful' type
        const { rerender, container } = render(<FeedbackForm {...defaultProps} />);
        const wrapper = createWrapper(container);

        const helpfulInput = wrapper.findInput('[data-testid="feedback-form-comment-input"]');

        expect(helpfulInput?.findNativeInput().getElement()).toHaveAttribute(
            'placeholder',
            'Tell us why this response was not-helpful...'
        );

        // // Test with 'helpful' type
        rerender(<FeedbackForm {...defaultProps} feedbackType={'helpful' as const} />);
        const notHelpfulInput = wrapper.findInput('[data-testid="feedback-form-comment-input"]');
        expect(notHelpfulInput?.findNativeInput().getElement()).toHaveAttribute(
            'placeholder',
            'Tell us why this response was helpful...'
        );
        expect(screen.queryByTestId('feedback-form-reasons-field')).not.toBeInTheDocument()
    });

    it('shows error when feedback comment exceeds maximum length', async () => {
        const { container } = render(<FeedbackForm {...defaultProps} />);
        const wrapper = createWrapper(container);
        const user = userEvent.setup();

        // Generate a string longer than MAX_FEEDBACK_INPUT_LENGTH
        const longComment = 'a'.repeat(MAX_FEEDBACK_INPUT_LENGTH + 1);
        
        const commentInput = wrapper.findInput()!.findNativeInput();
        await user.type(commentInput.getElement(), longComment);

        // Check for error message
        const errorMessage = `The feedback comment has too many characters. Character count: ${longComment.length}/${MAX_FEEDBACK_INPUT_LENGTH}`;
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('does not show error when feedback comment is at maximum length', async () => {
        const { container } = render(<FeedbackForm {...defaultProps} />);
        const wrapper = createWrapper(container);
        const user = userEvent.setup();

        // Generate a string of length MAX_FEEDBACK_INPUT_LENGTH
        const longComment = 'a'.repeat(MAX_FEEDBACK_INPUT_LENGTH);
        
        const commentInput = wrapper.findInput()!.findNativeInput();
        await user.type(commentInput.getElement(), longComment);

        // Check that there is no error message
        const errorMessage = `${longComment.length}/${MAX_FEEDBACK_INPUT_LENGTH}`;
        expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
    });

    it('disables submit button when feedback comment is in error state', async () => {
        const { container } = render(<FeedbackForm {...defaultProps} />);
        const wrapper = createWrapper(container);
        const user = userEvent.setup();

        // Type a comment that exceeds the maximum length
        const longComment = 'a'.repeat(MAX_FEEDBACK_INPUT_LENGTH + 1);
        const commentInput = wrapper.findInput()!.findNativeInput();
        await user.type(commentInput.getElement(), longComment);

        // Check that submit button is disabled
        const submitButton = wrapper.findButton('[data-testid="feedback-form-submit-button"]')!;
        expect(submitButton.isDisabled()).toBe(true);
    });

    it('enables submit button when feedback comment is valid', async () => {
        const { container } = render(<FeedbackForm {...defaultProps} />);
        const wrapper = createWrapper(container);
        const user = userEvent.setup();

        // Type a valid comment
        const validComment = 'This is a valid comment';
        const commentInput = wrapper.findInput()!.findNativeInput();
        await user.type(commentInput.getElement(), validComment);

        // Check that submit button is enabled
        const submitButton = wrapper.findButton('[data-testid="feedback-form-submit-button"]')!;
        expect(submitButton.isDisabled()).toBe(false);
    });

    it('clears error and enabled submit button when feedback comment is reduced to valid length', async () => {
        const { container } = render(<FeedbackForm {...defaultProps} />);
        const wrapper = createWrapper(container);
        const user = userEvent.setup();

        // First type a long comment
        const longComment = 'a'.repeat(MAX_FEEDBACK_INPUT_LENGTH + 1);
        const commentInput = wrapper.findInput()!.findNativeInput();
        await user.type(commentInput.getElement(), longComment);

        // Check that submit button is disabled
        const submitButton = wrapper.findButton('[data-testid="feedback-form-submit-button"]')!;
        expect(submitButton.isDisabled()).toBe(true);

        // Verify error is shown
        const errorMessage = `The feedback comment has too many characters. Character count: ${longComment.length}/${MAX_FEEDBACK_INPUT_LENGTH}`;
        expect(screen.getByText(errorMessage)).toBeInTheDocument();

        // Clear the input
        await user.clear(commentInput.getElement());
        // Type a valid comment
        await user.type(commentInput.getElement(), 'Valid comment');

        // Verify error is gone
        expect(screen.queryByText(/The feedback comment has too many characters/)).not.toBeInTheDocument();

        // Check that submit button is enabled
        expect(submitButton.isDisabled()).toBe(false);
    });

    // Update existing 'submits form with correct data' test to verify submission is blocked when in error state
    it('prevents form submission when feedback comment is in error state', async () => {
        const { container } = render(<FeedbackForm {...defaultProps} />);
        const wrapper = createWrapper(container);
        const user = userEvent.setup();

        // Type an invalid comment
        const longComment = 'a'.repeat(MAX_FEEDBACK_INPUT_LENGTH + 1);
        const commentInput = wrapper.findInput()!.findNativeInput();
        await user.type(commentInput.getElement(), longComment);

        // Try to submit form
        const submitButton = wrapper.findButton('[data-testid="feedback-form-submit-button"]')!;
        await user.click(submitButton.getElement());

        // Verify onSubmit was not called
        expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('shows error message for invalid characters', async () => {
        const { container } = render(<FeedbackForm {...defaultProps} />);
        const wrapper = createWrapper(container);
        const user = userEvent.setup();

        // Input with HTML and script tags
        const unsafeInput = '<script>alert("XSS")</script>';
        const commentInput = wrapper.findInput()!.findNativeInput();
        
        // Set the value
        await user.type(commentInput.getElement(), unsafeInput);

        // Check for error message
        expect(screen.getByText('Feedback can only contain letters, numbers, spaces, and basic punctuation (.,!?-)')).toBeInTheDocument();
        
        // Verify submit button is disabled
        const submitButton = wrapper.findButton('[data-testid="feedback-form-submit-button"]')!;
        expect(submitButton.isDisabled()).toBe(true);
    });

    it('accepts valid input with spaces and allowed punctuation', async () => {
        const { container } = render(<FeedbackForm {...defaultProps} />);
        const wrapper = createWrapper(container);
        const user = userEvent.setup();

        // Input with spaces and allowed punctuation
        const input = 'This is a valid comment. With punctuation! And questions? And-dashes.';
        const commentInput = wrapper.findInput()!.findNativeInput();
        
        await user.type(commentInput.getElement(), input);
        
        // Verify no error message is shown
        expect(screen.queryByText('Feedback can only contain letters, numbers, spaces, and basic punctuation (.,!?-)')).not.toBeInTheDocument();
        
        // Submit form
        const submitButton = wrapper.findButton('[data-testid="feedback-form-submit-button"]')!;
        expect(submitButton.isDisabled()).toBe(false);
        
        await user.click(submitButton.getElement());

        // Verify input is submitted as-is
        expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
            comment: input
        }));
    });

    it('shows error for SQL injection attempts', async () => {
        const { container } = render(<FeedbackForm {...defaultProps} />);
        const wrapper = createWrapper(container);
        const user = userEvent.setup();

        // SQL injection attempt
        const sqlInjection = "'; DROP TABLE users; --";
        const commentInput = wrapper.findInput()!.findNativeInput();
        
        await user.type(commentInput.getElement(), sqlInjection);
        
        // Check for error message
        expect(screen.getByText('Feedback can only contain letters, numbers, spaces, and basic punctuation (.,!?-)')).toBeInTheDocument();
        
        // Verify submit button is disabled
        const submitButton = wrapper.findButton('[data-testid="feedback-form-submit-button"]')!;
        expect(submitButton.isDisabled()).toBe(true);
    });
});
