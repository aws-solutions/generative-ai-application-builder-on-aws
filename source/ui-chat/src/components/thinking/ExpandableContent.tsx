// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import './ExpandableContent.scss';

interface ExpandableContentProps {
    content: string;
    maxLength?: number;
    'data-testid'?: string;
}

export const ExpandableContent: React.FC<ExpandableContentProps> = ({ 
    content, 
    maxLength = 200,
    'data-testid': dataTestId 
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const needsTruncation = content.length > maxLength;
    const displayContent = needsTruncation && !isExpanded 
        ? content.substring(0, maxLength) + '...' 
        : content;

    return (
        <div className="expandable-content" data-testid={dataTestId}>
            <span className="expandable-content__text">{displayContent}</span>
            {needsTruncation && (
                <button
                    className="expandable-content__toggle"
                    onClick={() => setIsExpanded(!isExpanded)}
                    aria-expanded={isExpanded}
                    data-testid={`${dataTestId}-toggle`}
                >
                    {isExpanded ? 'Show less' : 'Show more'}
                </button>
            )}
        </div>
    );
};
