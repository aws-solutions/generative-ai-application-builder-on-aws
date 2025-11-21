// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { Icon } from '@cloudscape-design/components';
import { ToolUsageInfo } from '../../models/api/response';
import './ToolUsageIndicator.scss';

export interface ToolUsageIndicatorProps {
    toolUsage: ToolUsageInfo;
    'data-testid'?: string;
}

/**
 * ToolUsageIndicator component displays tool invocation information in a subtle, expandable format
 * 
 * @param toolUsage - Tool usage information
 * @param data-testid - Optional test id for the component
 */
export function ToolUsageIndicator({ 
    toolUsage, 
    'data-testid': dataTestId = 'tool-usage-indicator' 
}: ToolUsageIndicatorProps) {
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    
    const isCompleted = toolUsage.status === 'completed' || toolUsage.status === 'failed';
    const isFailed = toolUsage.status === 'failed';
    
    // Check if there's content to expand
    const hasContent = !!(toolUsage.toolInput || toolUsage.toolOutput || toolUsage.error);
    
    return (
        <div
            className={`tool-usage-indicator ${isCompleted ? 'tool-usage-indicator--completed' : 'tool-usage-indicator--active'} ${isFailed ? 'tool-usage-indicator--failed' : ''}`}
            data-testid={dataTestId}
            data-status={toolUsage.status}
            role="status"
            aria-live="polite"
            aria-label={`Tool ${toolUsage.toolName} ${isCompleted ? 'completed' : 'in progress'}`}
        >
            <div className="tool-usage-indicator__content">
                <button
                    className="tool-usage-indicator__toggle"
                    onClick={() => hasContent && setIsExpanded(!isExpanded)}
                    disabled={!hasContent}
                    aria-expanded={hasContent ? isExpanded : undefined}
                    aria-label={hasContent ? (isExpanded ? 'Collapse tool details' : 'Expand tool details') : 'No tool details available'}
                    data-testid="tool-toggle"
                >
                    <span className="tool-usage-indicator__text">
                        Called <span className="tool-usage-indicator__name" data-testid="tool-name">{toolUsage.toolName}</span>
                        {toolUsage.mcpServerName && (
                            <span className="tool-usage-indicator__mcp" data-testid="mcp-server-badge">
                                {' '}(MCP: {toolUsage.mcpServerName})
                            </span>
                        )}
                    </span>
                    {hasContent && (
                        <Icon
                            name={isExpanded ? 'caret-up-filled' : 'caret-down-filled'}
                            size="small"
                        />
                    )}
                </button>
            </div>
            {isExpanded && hasContent && (
                <div className="tool-usage-indicator__details" data-testid="tool-details">
                    {toolUsage.error && (
                        <div className="tool-usage-indicator__section">
                            <div className="tool-usage-indicator__section-title">Error</div>
                            <div className="tool-usage-indicator__error" data-testid="tool-error">
                                {toolUsage.error}
                            </div>
                        </div>
                    )}
                    {toolUsage.toolInput && (
                        <div className="tool-usage-indicator__section">
                            <div className="tool-usage-indicator__section-title">Input</div>
                            <pre className="tool-usage-indicator__code" data-testid="tool-input">
                                {JSON.stringify(toolUsage.toolInput, null, 2)}
                            </pre>
                        </div>
                    )}
                    {toolUsage.toolOutput && (
                        <div className="tool-usage-indicator__section">
                            <div className="tool-usage-indicator__section-title">Output</div>
                            <pre className="tool-usage-indicator__code" data-testid="tool-output">
                                {toolUsage.toolOutput}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
