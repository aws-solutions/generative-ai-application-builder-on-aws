// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@cloudscape-design/chat-components/test-utils/dom';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import { ChatBubbleMessage } from '../../../../../pages/chat/types';
import { OutgoingMessageProps } from '../../../../../pages/chat/components/messages/types';
import { OutgoingMessage } from '../../../../../pages/chat/components/messages/OutgoingMessage';
import { UploadedFile } from '../../../../../types/file-upload';
import { act } from 'react';
import { UserProvider } from '../../../../../contexts/UserContext';

vi.mock('../../../../../contexts/UserContext', async () => {
    const actual = await vi.importActual('../../../../../contexts/UserContext');
    return {
        ...actual,
        useUser: vi.fn(() => ({
            getAccessToken: vi.fn(() => Promise.resolve('mock-token'))
        })),
        UserProvider: ({ children }: { children: React.ReactNode }) => children
    };
});

vi.mock('@reduxjs/toolkit/query', () => ({
    createApi: vi.fn(),
    fetchBaseQuery: vi.fn()
}));

vi.mock('../../../../../store/solutionApi', () => ({
    useGetDeploymentQuery: vi.fn(() => ({ data: null, error: null })),
    useLazyGetFileDownloadUrlQuery: () => [vi.fn(), {}]
}));

vi.mock('react-redux', () => ({
    useDispatch: vi.fn(() => vi.fn()),
    useSelector: vi.fn(() => ({}))
}));

vi.mock('@aws-amplify/auth', () => ({
    getCurrentUser: vi.fn(() => Promise.resolve({ userId: 'test-user', username: 'testuser' })),
    fetchUserAttributes: vi.fn(() => Promise.resolve({ name: 'Test User', email: 'test@example.com' }))
}));

const customScreen = {
    ...screen,
    getByClassName: (className: string): HTMLElement => {
        const element = document.querySelector(`.${className}`);
        if (!element) {
            throw new Error(`Unable to find element with class: ${className}`);
        }
        return element as HTMLElement;
    },
    queryByClassName: (className: string): HTMLElement | null => {
        return document.querySelector(`.${className}`);
    }
};

describe('OutgoingMessage', () => {
    const mockMessage: ChatBubbleMessage = {
        type: 'chat-bubble',
        authorId: 'user-1',
        content: 'Hello, this is a test message',
        timestamp: '2024-01-01T12:00:00Z',
        avatarLoading: false,
        hideAvatar: false
    };

    const mockAuthor: {
        type: 'user' | 'assistant';
        name: string;
        avatar?: string;
        description?: string;
    } = {
        type: 'user' as const,
        name: 'Test User',
        avatar: 'path/to/avatar.png',
        description: 'Test User Description'
    };

    const mockProps: OutgoingMessageProps = {
        message: mockMessage,
        author: mockAuthor,
        'data-testid': 'test-outgoing-message'
    };

    it('renders the chat bubble component', () => {
        const { container } = render(<OutgoingMessage {...mockProps} />);
        const wrapper = createWrapper(container);

        expect(wrapper.findChatBubble()).toBeTruthy();
    });

    it('renders with correct content', () => {
        const { container } = render(<OutgoingMessage {...mockProps} />);
        const wrapper = createWrapper(container);

        const contentSlot = wrapper.findChatBubble()?.findContentSlot();
        expect(contentSlot?.getElement()).toHaveTextContent(String(mockMessage.content));
    });

    it('renders avatar when provided', () => {
        const { container } = render(<OutgoingMessage {...mockProps} />);
        const wrapper = createWrapper(container);

        const avatarSlot = wrapper.findChatBubble()?.findAvatarSlot();
        expect(avatarSlot).toBeTruthy();
    });

    it('shows loading bar when avatarLoading is true', () => {
        const loadingProps: OutgoingMessageProps = {
            ...mockProps,
            message: {
                ...mockMessage,
                avatarLoading: true
            }
        };

        const { container } = render(<OutgoingMessage {...loadingProps} />);
        const wrapper = createWrapper(container);

        const loadingBar = wrapper.findChatBubble()?.findLoadingBar();
        expect(loadingBar).toBeTruthy();
    });

    describe('Long message handling', () => {
        const mockResizeObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn()
        }));
        window.ResizeObserver = mockResizeObserver;

        beforeEach(() => {
            // Mock the ref measurements
            Element.prototype.getBoundingClientRect = vi.fn(() => ({
                height: 300, // Greater than previewHeight
                bottom: 300,
                left: 0,
                right: 0,
                top: 0,
                width: 100,
                x: 0,
                y: 0,
                toJSON: () => {}
            }));

            // Mock scrollHeight
            Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
                configurable: true,
                get: function () {
                    return 300;
                }
            });
        });
        const longMessage: ChatBubbleMessage = {
            ...mockMessage,
            content:
                'Line 1 \nLine 2 \nLine 3 \nLine 4 \nLine 5 \nLine 6 \nLine 7 \nLine 1 \nLine 2 \nLine 3 \nLine 4 \nLine 5 \nLine 6 \nLine 7 \nLine 8 \nLine 9 \nLine 10 \nLine 11\nLine 12'
        };

        const longMessageProps: OutgoingMessageProps = {
            ...mockProps,
            previewHeight: 10,
            message: longMessage
        };

        it('shows "Show more" button for long content', async () => {
            await act(async () => {
                render(
                    <OutgoingMessage
                        message={mockMessage}
                        author={mockAuthor}
                        data-testid="test-message"
                        previewHeight={200}
                    />
                );
            });

            expect(screen.getByText('Show more')).toBeInTheDocument();
            expect(customScreen.getByClassName('outgoing-message__gradient-overlay')).toBeInTheDocument();
        });

        it('toggles between expanded and collapsed states', async () => {
            await act(async () => {
                render(
                    <OutgoingMessage
                        message={mockMessage}
                        author={mockAuthor}
                        data-testid="test-message"
                        previewHeight={200}
                    />
                );
            });

            await act(async () => {
                fireEvent.click(screen.getByText('Show more'));
            });
            expect(screen.getByText('Show less')).toBeInTheDocument();

            await act(async () => {
                fireEvent.click(screen.getByText('Show less'));
            });
            expect(screen.getByText('Show more')).toBeInTheDocument();
        });

        it('respects custom previewHeight prop', () => {
            const { container } = render(<OutgoingMessage {...longMessageProps} previewHeight={100} />);

            const wrapper = createWrapper(container);
            const contentWrapper = wrapper.findByClassName('outgoing-message__content-wrapper');
            expect(contentWrapper?.getElement()).toHaveStyle({ maxHeight: '100px' });
        });
    });

    it('applies correct aria-label', () => {
        const { container } = render(<OutgoingMessage {...mockProps} />);
        const wrapper = createWrapper(container);

        const chatBubble = wrapper.findChatBubble();
        expect(chatBubble?.getElement()).toHaveAttribute(
            'aria-label',
            `${mockAuthor.name} at ${mockMessage.timestamp}`
        );
    });

    it('renders with data-testid', () => {
        render(<OutgoingMessage {...mockProps} />);
        expect(screen.getByTestId('test-outgoing-message')).toBeInTheDocument();
    });

    describe('Gradient overlay', () => {
        const longMessageProps: OutgoingMessageProps = {
            ...mockProps,
            message: {
                ...mockMessage,
                content:
                    'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10\nLine 11\nLine 12'
            }
        };

        beforeEach(() => {
            // Mock scrollHeight to simulate long content
            Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
                configurable: true,
                get: function () {
                    return 400;
                }
            });
        });

        it('shows gradient overlay for long messages when collapsed', async () => {
            await act(async () => {
                render(<OutgoingMessage {...longMessageProps} />);
            });

            const gradientOverlay = customScreen.getByClassName('outgoing-message__gradient-overlay');
            expect(gradientOverlay).toBeInTheDocument();
        });

        it('removes gradient overlay when message is expanded', async () => {
            await act(async () => {
                render(<OutgoingMessage {...longMessageProps} />);
            });

            await act(async () => {
                const showMoreButton = screen.getByText('Show more');
                fireEvent.click(showMoreButton);
            });

            const gradientOverlay = customScreen.queryByClassName('outgoing-message__gradient-overlay');
            expect(gradientOverlay).not.toBeInTheDocument();
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });
    });

    describe('FileDisplay', () => {
        const mockFiles: UploadedFile[] = [
            {
                key: 'file-key-1',
                fileName: 'document.pdf',
                fileContentType: 'application/pdf',
                fileExtension: 'pdf',
                fileSize: 1024000
            }
        ];

        it('renders FileDisplay component when files are present', () => {
            const messageWithFiles: ChatBubbleMessage = {
                ...mockMessage,
                files: mockFiles
            };

            const propsWithFiles: OutgoingMessageProps = {
                ...mockProps,
                message: messageWithFiles
            };

            const { container } = render(
                <UserProvider>
                    <OutgoingMessage {...propsWithFiles} />
                </UserProvider>
            );
            const fileDisplay = container.querySelector('[data-testid="file-display"]');
            expect(fileDisplay).toBeInTheDocument();
        });

        it('does not render FileDisplay when no files are present', () => {
            const { container } = render(
                <UserProvider>
                    <OutgoingMessage {...mockProps} />
                </UserProvider>
            );
            const fileDisplay = container.querySelector('[data-testid="file-display"]');
            expect(fileDisplay).not.toBeInTheDocument();
        });

        it('renders files above message content in correct order', () => {
            const messageWithFiles: ChatBubbleMessage = {
                ...mockMessage,
                content: 'Message with files attached',
                files: mockFiles
            };

            const propsWithFiles: OutgoingMessageProps = {
                ...mockProps,
                message: messageWithFiles
            };

            const { container } = render(
                <UserProvider>
                    <OutgoingMessage {...propsWithFiles} />
                </UserProvider>
            );

            const fileDisplay = container.querySelector('[data-testid="file-display"]');
            const messageContent = container.querySelector('.outgoing-message__content-wrapper');

            expect(fileDisplay).toBeInTheDocument();
            expect(messageContent).toBeInTheDocument();

            if (fileDisplay && messageContent) {
                expect(fileDisplay.compareDocumentPosition(messageContent)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
            }
        });
    });
});
