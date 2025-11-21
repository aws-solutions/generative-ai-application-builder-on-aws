// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ThinkingIndicator } from '../../../components/thinking/ThinkingIndicator';
import { ThinkingMetadata } from '../../../pages/chat/types';

describe('ThinkingIndicator', () => {
    describe('Basic Rendering', () => {
        it('should render with completed thinking metadata', () => {
            const thinking: ThinkingMetadata = {
                duration: 5,
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString()
            };

            render(<ThinkingIndicator thinking={thinking} />);

            expect(screen.getByTestId('thinking-indicator')).toBeInTheDocument();
        });

        it('should render with stripped content', () => {
            const thinking: ThinkingMetadata = {
                duration: 3,
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                strippedContent: 'Some thinking content'
            };

            render(<ThinkingIndicator thinking={thinking} />);

            expect(screen.getByTestId('thinking-indicator')).toBeInTheDocument();
        });

        it('should accept custom data-testid', () => {
            const thinking: ThinkingMetadata = {
                duration: 2,
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString()
            };

            render(<ThinkingIndicator thinking={thinking} data-testid="custom-thinking" />);

            expect(screen.getByTestId('custom-thinking')).toBeInTheDocument();
        });
    });

    describe('Duration Display', () => {
        it('should display duration in seconds', () => {
            const thinking: ThinkingMetadata = {
                duration: 5,
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString()
            };

            render(<ThinkingIndicator thinking={thinking} />);

            expect(screen.getByText(/5s/)).toBeInTheDocument();
        });

        it('should display duration in minutes and seconds', () => {
            const thinking: ThinkingMetadata = {
                duration: 75,
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString()
            };

            render(<ThinkingIndicator thinking={thinking} />);

            expect(screen.getByText(/1m 15s/)).toBeInTheDocument();
        });
    });
});
