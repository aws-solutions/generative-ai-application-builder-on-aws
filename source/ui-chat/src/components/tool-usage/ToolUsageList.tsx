// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ToolUsageInfo } from '../../models/api/response';
import { ToolUsageIndicator } from '../tools/ToolUsageIndicator';
import './ToolUsageList.scss';

export interface ToolUsageListProps {
    toolUsage: ToolUsageInfo[];
    'data-testid'?: string;
}

/**
 * ToolUsageList component displays a list of tool usage indicators
 * 
 * @param toolUsage - Array of tool usage information
 * @param data-testid - Optional test id for the component
 */
export function ToolUsageList({ 
    toolUsage, 
    'data-testid': dataTestId = 'tool-usage-list' 
}: ToolUsageListProps) {
    if (!toolUsage || toolUsage.length === 0) {
        return null;
    }
    
    return (
        <div 
            className="tool-usage-list"
            data-testid={dataTestId}
            role="region"
            aria-label="Tools used by the agent"
        >
            {toolUsage.map((tool, index) => (
                <ToolUsageIndicator
                    key={`${tool.toolName}-${tool.startTime}-${index}`}
                    toolUsage={tool}
                    data-testid={`tool-usage-item-${index}`}
                />
            ))}
        </div>
    );
}
