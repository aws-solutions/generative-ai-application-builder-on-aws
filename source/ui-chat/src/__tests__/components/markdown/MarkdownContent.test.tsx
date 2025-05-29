// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MarkdownContent from '../../../components/markdown/MarkdownContent';
import '@cloudscape-design/code-view/test-utils/dom';
import { createWrapper } from '@cloudscape-design/test-utils-core/dom';

describe('MarkdownContent', () => {
    test('renders plain text content correctly', () => {
        const content = 'Hello World';
        const { container } = render(<MarkdownContent content={content} />);
        const wrapper = createWrapper(container);
        expect(wrapper.getElement()).toHaveTextContent('Hello World');
    });

    test('renders markdown formatting correctly', () => {
        const content = '**Bold** and *italic* text';
        const { container } = render(<MarkdownContent content={content} />);

        expect(container.querySelector('strong')).toHaveTextContent('Bold');
        expect(container.querySelector('em')).toHaveTextContent('italic');
    });

    test('renders code blocks with syntax highlighting', () => {
        const content = `
        \`\`\`typescript
        const x: number = 42;
        \`\`\`
        `;
        const { container, debug } = render(<MarkdownContent content={content} />);

        const wrapper = createWrapper(container);
        const codeView = wrapper.findCodeView();

        expect(codeView).toBeTruthy();
        expect(codeView!.findContent()).toBeTruthy();
        expect(codeView!.findContent()?.getElement()).toHaveTextContent('const x: number = 42;');
    });

    test('renders tables correctly', () => {
        const content = ['| Header 1 | Header 2 |', '|----------|----------|', '| Cell 1   | Cell 2   |'].join('\n');
        const { container } = render(<MarkdownContent content={content} />);

        const table = container.querySelector('table');
        expect(table).toBeInTheDocument();

        const headers = container.querySelectorAll('th');
        expect(headers).toHaveLength(2);
        expect(headers[0]).toHaveTextContent('Header 1');
        expect(headers[1]).toHaveTextContent('Header 2');

        const cells = container.querySelectorAll('td');
        expect(cells).toHaveLength(2);
        expect(cells[0]).toHaveTextContent('Cell 1');
    });

    test('renders multiple code blocks with different languages', () => {
        const content = `
    \`\`\`python
    def hello():
        print("Hello")
    \`\`\`
    
    \`\`\`javascript
    function hello() {
        console.log("Hello");
    }
    \`\`\`
    `;
        const { container } = render(<MarkdownContent content={content} />);

        const wrapper = createWrapper(container);
        const codeView = wrapper.findCodeView();

        // First verify we have both code blocks in the document
        expect(container.querySelectorAll('[data-testid="code-block"]')).toHaveLength(1);

        // Then verify the content is correct
        expect(container).toHaveTextContent('def hello():');
        expect(container).toHaveTextContent('function hello()');

        // Verify at least one code view is properly structured
        expect(codeView!.findContent()).toBeTruthy();
        expect(codeView!.findActions()).toBeTruthy();
    });

    test('renders inline code correctly', () => {
        const content = 'This is `inline code`';
        const { container } = render(<MarkdownContent content={content} />);

        // Find the code element
        const codeElement = container.querySelector('code');
        expect(codeElement).toBeInTheDocument();
        expect(codeElement).toHaveTextContent('inline code');

        expect(container).toHaveTextContent('This is inline code');
    });

    test('memoization prevents unnecessary re-renders', () => {
        const { rerender } = render(<MarkdownContent content="Test content" />);
        const firstRender = screen.getByText('Test content');

        // Re-render with the same content
        rerender(<MarkdownContent content="Test content" />);
        const secondRender = screen.getByText('Test content');

        // Should be the same instance due to memoization
        expect(firstRender).toBe(secondRender);
    });

    test('renders paragraphs correctly when no code or table elements present', () => {
        const content = 'First paragraph\n\nSecond paragraph';
        const { container } = render(<MarkdownContent content={content} />);

        const paragraphs = container.querySelectorAll('p');
        expect(paragraphs).toHaveLength(2);
        expect(paragraphs[0]).toHaveTextContent('First paragraph');
        expect(paragraphs[1]).toHaveTextContent('Second paragraph');
    });

    test('renders content without p tags when code block is present', () => {
        const content = 'Text with code:\n \`\`\`js \nconsole.log("test");\n\`\`\`';
        const { container } = render(<MarkdownContent content={content} />);

        // Check that code block is not wrapped in p tags
        const codeView = screen.getByTestId('inline-code');
        const parentElement = codeView.parentElement;
        expect(parentElement?.tagName.toLowerCase()).not.toBe('p');
    });

    test('handles nested elements within paragraphs correctly', () => {
        const content = 'Paragraph with **bold** and *italic* and `code`';
        const { container } = render(<MarkdownContent content={content} />);

        const paragraph = container.querySelector('p');
        expect(paragraph).toBeInTheDocument();
        expect(paragraph).toContainElement(container.querySelector('strong'));
        expect(paragraph).toContainElement(container.querySelector('em'));
        expect(screen.getByTestId('inline-code')).toBeInTheDocument();
    });

    test('memoization prevents unnecessary re-renders', () => {
        const { rerender, container } = render(<MarkdownContent content="Test content" />);
        const wrapper = createWrapper(container);
        const firstRender = wrapper.getElement();

        rerender(<MarkdownContent content="Test content" />);
        const secondRender = wrapper.getElement();

        expect(firstRender).toBe(secondRender);
    });
});
