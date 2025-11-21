// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from 'react';
import { Icon } from '@cloudscape-design/components';
import { ThinkingMetadata } from '../../pages/chat/types';
import { ExpandableContent } from './ExpandableContent';
import './ThinkingIndicator.scss';

export interface ThinkingIndicatorProps {
    thinking: ThinkingMetadata;
    'data-testid'?: string;
}

const formatDuration = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) {
        return '0s';
    }
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
};

/**
 * ThinkingIndicator component displays thinking status for a message
 * 
 * @param thinking - Thinking metadata from the message
 * @param data-testid - Optional test id for the component
 */
export function ThinkingIndicator({ thinking, 'data-testid': dataTestId = 'thinking-indicator' }: ThinkingIndicatorProps) {
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    
    const isCompleted = thinking.duration > 0;
    
    const calculateElapsed = () => {
        if (!thinking.startTime) return 0;
        const start = new Date(thinking.startTime).getTime();
        const now = Date.now();
        return Math.floor((now - start) / 1000);
    };
    
    const [liveElapsed, setLiveElapsed] = useState<number>(() => calculateElapsed());
    
    useEffect(() => {
        if (!isCompleted && thinking.startTime) {
            const updateElapsed = () => {
                const start = new Date(thinking.startTime).getTime();
                const now = Date.now();
                const elapsed = Math.floor((now - start) / 1000);
                setLiveElapsed(elapsed);
            };
            
            updateElapsed();
            
            const interval = setInterval(updateElapsed, 1000);
            
            return () => clearInterval(interval);
        }
    }, [isCompleted, thinking.startTime]);
    
    const hasContent = thinking.strippedContent && thinking.strippedContent.length > 0;
    const displayDuration = isCompleted ? thinking.duration : liveElapsed;
    const formattedDuration = formatDuration(displayDuration);
    const displayText = isCompleted ? 'Thought for' : 'Thinking for';

    return (
        <div
            className={`thinking-indicator ${isCompleted ? 'thinking-indicator--completed' : 'thinking-indicator--active'}`}
            data-testid={dataTestId}
            role="status"
            aria-live="polite"
            aria-label={isCompleted ? 'Agent finished thinking' : 'Agent is thinking'}
        >
            <div className="thinking-indicator__content">
                <button
                    className="thinking-indicator__toggle"
                    onClick={() => hasContent && setIsExpanded(!isExpanded)}
                    disabled={!hasContent}
                    aria-expanded={hasContent ? isExpanded : undefined}
                    aria-label={hasContent ? (isExpanded ? 'Collapse thinking details' : 'Expand thinking details') : 'No thinking details available'}
                    data-testid="thinking-toggle"
                >
                    <span className="thinking-indicator__text">
                        {displayText} <span className="thinking-indicator__duration" data-testid="thinking-duration">{formattedDuration}</span>
                    </span>
                    {hasContent && (
                        <Icon
                            name={isExpanded ? 'caret-up-filled' : 'caret-down-filled'}
                            size="small"
                        />
                    )}
                </button>
            </div>
            {isExpanded && hasContent && thinking.strippedContent && (
                <div className="thinking-indicator__details" data-testid="thinking-details">
                    <ul className="thinking-indicator__list">
                        {thinking.strippedContent.split('\n').filter(line => line.trim()).map((line, index) => (
                            <li key={index} className="thinking-indicator__list-item">
                                <ExpandableContent 
                                    content={line.trim()}
                                    maxLength={200}
                                    data-testid={`thinking-content-${index}`}
                                />
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
