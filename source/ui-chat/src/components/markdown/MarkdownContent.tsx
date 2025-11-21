// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { memo, useState } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import CodeView from '@cloudscape-design/code-view/code-view';
import { CopyToClipboard } from '@cloudscape-design/components';

import typescriptHighlight from '@cloudscape-design/code-view/highlight/typescript';
import javascriptHighlight from '@cloudscape-design/code-view/highlight/javascript';
import pythonHighlight from '@cloudscape-design/code-view/highlight/python';
import javaHighlight from '@cloudscape-design/code-view/highlight/java';
import { ExternalLinkWarningModal } from '../common/common-components';
import './MarkdownContent.scss';

/**
 * Map of language identifiers to their corresponding syntax highlighting functions
 * Defaults to typescript highlighting if language isn't found
 */
const highlightMap: Record<string, (code: string) => React.ReactNode> = {
    typescript: typescriptHighlight,
    javascript: javascriptHighlight,
    python: pythonHighlight,
    java: javaHighlight,
    // Default to typescript if language isn't found
    default: typescriptHighlight
};

/**
 * Custom components for rendering different Markdown elements
 */
const MARKDOWN_COMPONENTS: Components = {
    /**
     * Renders code blocks and inline code
     * Supports syntax highlighting for typescript, javascript, python and java
     * Includes copy to clipboard functionality for code blocks
     */
    code: ({ className, children }) => {
        const match = /language-(\w+)/.exec(className || '');
        const language = match ? match[1].toLowerCase() : 'typescript';

        // remove trailing new line char
        const code = String(children).replace(/\n$/, '');

        // Check if remaining code contains multiple lines
        const hasMultipleLines = code.includes('\n');
        if (!hasMultipleLines) return <code data-testid="inline-code">{children}</code>;

        return (
            <div className="markdown-code-block">
                <CodeView
                    data-testid="code-block"
                    content={code}
                    highlight={highlightMap[language] || highlightMap.default}
                    lineNumbers={hasMultipleLines}
                    wrapLines={true}
                    actions={
                        <CopyToClipboard
                            copyButtonAriaLabel="Copy code"
                            copyErrorText="Code failed to copy"
                            copySuccessText="Code copied"
                            textToCopy={code}
                        />
                    }
                />
            </div>
        );
    },
    /**
     * Renders paragraph elements
     */
    p({ children }) {
        // Otherwise, render as normal paragraph
        return <p>{children}</p>;
    },
    /**
     * Renders table elements with custom container and styling
     */
    table({ children }) {
        return (
            <div className="markdown-table-container">
                <table className="markdown-table">{children}</table>
            </div>
        );
    },
    /**
     * Renders table header cells with custom styling
     */
    th({ children }) {
        return <th className="markdown-th">{children}</th>;
    },
    /**
     * Renders table data cells with custom styling
     */
    td({ children }) {
        return <td className="markdown-td">{children}</td>;
    }
};

/**
 * Props interface for MarkdownContent component
 */
interface MarkdownContentProps {
    content: string;
}

const stripThinkingTags = (text: string): string => {
    // Remove thinking tags and everything between them (case-insensitive, global, multiline)
    return text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
};

/**
 * Component that renders Markdown content with custom styling and components
 * Supports GitHub Flavored Markdown and math expressions
 * Memoized to prevent unnecessary re-renders
 */
const MarkdownContent = memo(({ content }: MarkdownContentProps) => {
    const [showExternalLinkModal, setShowExternalLinkModal] = useState(false);
    const [pendingExternalLink, setPendingExternalLink] = useState('');

    const handleExternalLinkClick = (href: string) => {
        setPendingExternalLink(href);
        setShowExternalLinkModal(true);
    };

    const handleModalDiscard = () => {
        setShowExternalLinkModal(false);
        setPendingExternalLink('');
    };

    // Strip thinking tags from content before rendering
    const cleanedContent = stripThinkingTags(content);

    // Create components with access to modal state
    const markdownComponents: Components = {
        ...MARKDOWN_COMPONENTS,
        /**
         * Renders links with external link warning modal
         */
        a({ href, children, ...props }) {
            const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'));

            if (isExternal) {
                return (
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            handleExternalLinkClick(href);
                        }}
                        {...props}
                    >
                        {children}
                    </a>
                );
            }

            return (
                <a href={href} {...props}>
                    {children}
                </a>
            );
        }
    };

    return (
        <div className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} components={markdownComponents}>
                {cleanedContent}
            </ReactMarkdown>
            <ExternalLinkWarningModal
                visible={showExternalLinkModal}
                onDiscard={handleModalDiscard}
                externalLink={pendingExternalLink}
                resourceType="external link"
            />
        </div>
    );
});

MarkdownContent.displayName = 'MarkdownContent';

export default MarkdownContent;
