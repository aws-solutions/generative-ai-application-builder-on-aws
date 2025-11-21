// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import AdditionalConfigurations from '../AdditionalConfigurations';
import {
    GATEWAY_REST_API_OUTBOUND_AUTH_TYPES,
    API_KEY_LOCATION,
    OAUTH_SCOPES_MAX_COUNT,
    OAUTH_CUSTOM_PARAMS_MAX_COUNT
} from '@/utils/constants';

describe('AdditionalConfigurations', () => {
    const mockOnConfigChange = vi.fn();
    const mockSetNumFieldsInError = vi.fn();

    const defaultOAuthProps = {
        authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH,
        additionalConfig: {
            oauthConfig: {
                scopes: [],
                customParameters: []
            }
        },
        onConfigChange: mockOnConfigChange,
        targetIndex: 0,
        setNumFieldsInError: mockSetNumFieldsInError
    };

    const defaultApiKeyProps = {
        authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.API_KEY,
        additionalConfig: {
            apiKeyConfig: {
                location: API_KEY_LOCATION.HEADER,
                parameterName: '',
                prefix: ''
            }
        },
        onConfigChange: mockOnConfigChange,
        targetIndex: 0,
        setNumFieldsInError: mockSetNumFieldsInError
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('OAuth Configuration', () => {
        test('renders OAuth configuration sections correctly', () => {
            render(<AdditionalConfigurations {...defaultOAuthProps} />);

            expect(screen.getByText('Scopes')).toBeInTheDocument();
            expect(screen.getByText('Custom parameters')).toBeInTheDocument();
            expect(screen.getByText('No scopes configured with this resource.')).toBeInTheDocument();
            expect(screen.getByText('No custom parameters configured with this resource.')).toBeInTheDocument();
        });

        test('displays add scope button', () => {
            render(<AdditionalConfigurations {...defaultOAuthProps} />);

            const addScopeButton = screen.getByTestId('add-scope-1');
            expect(addScopeButton).toBeInTheDocument();
            expect(addScopeButton).toHaveTextContent('Add scope');
        });

        test('displays scope input when scope exists', () => {
            const propsWithScope = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: ['read'],
                        customParameters: []
                    }
                }
            };

            render(<AdditionalConfigurations {...propsWithScope} />);

            const scopeInput = screen.getByTestId('oauth-scope-input-1-0');
            expect(scopeInput).toBeInTheDocument();

            const inputElement = scopeInput.querySelector('input');
            if (inputElement) {
                expect(inputElement.value).toBe('read');
            }
        });

        test('displays remove scope button when scope exists', () => {
            const propsWithScope = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: ['read'],
                        customParameters: []
                    }
                }
            };

            render(<AdditionalConfigurations {...propsWithScope} />);

            const removeScopeButton = screen.getByTestId('remove-scope-1-0');
            expect(removeScopeButton).toBeInTheDocument();
        });

        test('displays custom parameter inputs when parameters exist', () => {
            const propsWithParams = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: [],
                        customParameters: [{ key: 'client_id', value: 'test123' }]
                    }
                }
            };

            render(<AdditionalConfigurations {...propsWithParams} />);

            const keyInput = screen.getByTestId('oauth-param-key-1-0');
            const valueInput = screen.getByTestId('oauth-param-value-1-0');
            const removeButton = screen.getByTestId('remove-param-1-0');

            expect(keyInput).toBeInTheDocument();
            expect(valueInput).toBeInTheDocument();
            expect(removeButton).toBeInTheDocument();

            const keyInputElement = keyInput.querySelector('input');
            const valueInputElement = valueInput.querySelector('input');

            if (keyInputElement && valueInputElement) {
                expect(keyInputElement.value).toBe('client_id');
                expect(valueInputElement.value).toBe('test123');
            }
        });

        test('displays add custom parameter button', () => {
            render(<AdditionalConfigurations {...defaultOAuthProps} />);

            const addParamButton = screen.getByTestId('add-custom-param-1');
            expect(addParamButton).toBeInTheDocument();
            expect(addParamButton).toHaveTextContent('Add custom parameter');
        });

        test('disables add scope button when maximum scopes reached', () => {
            const maxScopes = Array(OAUTH_SCOPES_MAX_COUNT).fill('scope');
            const propsWithMaxScopes = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: maxScopes,
                        customParameters: []
                    }
                }
            };

            render(<AdditionalConfigurations {...propsWithMaxScopes} />);

            const addScopeButton = screen.getByTestId('add-scope-1');
            expect(addScopeButton).toBeDisabled();
            expect(addScopeButton).toHaveTextContent(`Maximum of ${OAUTH_SCOPES_MAX_COUNT} scopes reached`);
        });

        test('disables add custom parameter button when maximum parameters reached', () => {
            const maxParams = Array(OAUTH_CUSTOM_PARAMS_MAX_COUNT).fill({ key: 'key', value: 'value' });
            const propsWithMaxParams = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: [],
                        customParameters: maxParams
                    }
                }
            };

            render(<AdditionalConfigurations {...propsWithMaxParams} />);

            const addParamButton = screen.getByTestId('add-custom-param-1');
            expect(addParamButton).toBeDisabled();
            expect(addParamButton).toHaveTextContent(`Maximum of ${OAUTH_CUSTOM_PARAMS_MAX_COUNT} parameters reached`);
        });

        test('validates existing scopes on mount', () => {
            const propsWithInvalidScope = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: ['a'.repeat(101)], // Too long
                        customParameters: []
                    }
                }
            };

            render(<AdditionalConfigurations {...propsWithInvalidScope} />);

            expect(mockSetNumFieldsInError).toHaveBeenCalled();
        });

        test('validates existing custom parameters on mount', () => {
            const propsWithInvalidParams = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: [],
                        customParameters: [{ key: 'a'.repeat(101), value: 'b'.repeat(101) }]
                    }
                }
            };

            render(<AdditionalConfigurations {...propsWithInvalidParams} />);

            expect(mockSetNumFieldsInError).toHaveBeenCalled();
        });
    });

    describe('API Key Configuration', () => {
        test('renders API Key configuration sections correctly', () => {
            render(<AdditionalConfigurations {...defaultApiKeyProps} />);

            expect(screen.getByText('Location')).toBeInTheDocument();
            expect(screen.getByText('Parameter name')).toBeInTheDocument();
            expect(screen.getByText('Prefix')).toBeInTheDocument();
            expect(screen.getByText('Header')).toBeInTheDocument();
            expect(screen.getByText('Query parameter')).toBeInTheDocument();
        });

        test('displays location radio buttons', () => {
            render(<AdditionalConfigurations {...defaultApiKeyProps} />);

            const locationRadio = screen.getByTestId('api-key-location-radio-1');
            expect(locationRadio).toBeInTheDocument();
        });

        test('displays parameter name input', () => {
            render(<AdditionalConfigurations {...defaultApiKeyProps} />);

            const paramNameInput = screen.getByTestId('api-key-param-name-1');
            expect(paramNameInput).toBeInTheDocument();
        });

        test('displays prefix input', () => {
            render(<AdditionalConfigurations {...defaultApiKeyProps} />);

            const prefixInput = screen.getByTestId('api-key-prefix-1');
            expect(prefixInput).toBeInTheDocument();
        });

        test('shows existing API key configuration values', () => {
            const propsWithValues = {
                ...defaultApiKeyProps,
                additionalConfig: {
                    apiKeyConfig: {
                        location: API_KEY_LOCATION.QUERY,
                        parameterName: 'api_key',
                        prefix: 'Bearer'
                    }
                }
            };

            render(<AdditionalConfigurations {...propsWithValues} />);

            const paramNameInput = screen.getByTestId('api-key-param-name-1');
            const prefixInput = screen.getByTestId('api-key-prefix-1');

            const paramNameInputElement = paramNameInput.querySelector('input');
            const prefixInputElement = prefixInput.querySelector('input');

            if (paramNameInputElement && prefixInputElement) {
                expect(paramNameInputElement.value).toBe('api_key');
                expect(prefixInputElement.value).toBe('Bearer');
            }
        });

        test('validates existing API key configuration on mount', () => {
            const propsWithInvalidConfig = {
                ...defaultApiKeyProps,
                additionalConfig: {
                    apiKeyConfig: {
                        location: API_KEY_LOCATION.HEADER,
                        parameterName: 'a'.repeat(101), // Too long
                        prefix: 'b'.repeat(101) // Too long
                    }
                }
            };

            render(<AdditionalConfigurations {...propsWithInvalidConfig} />);

            expect(mockSetNumFieldsInError).toHaveBeenCalled();
        });
    });

    describe('Component Behavior', () => {
        test('does not render OAuth config when auth type is API_KEY', () => {
            render(<AdditionalConfigurations {...defaultApiKeyProps} />);

            expect(screen.queryByText('Scopes')).not.toBeInTheDocument();
            expect(screen.queryByText('Custom parameters')).not.toBeInTheDocument();
        });

        test('does not render API Key config when auth type is OAUTH', () => {
            render(<AdditionalConfigurations {...defaultOAuthProps} />);

            expect(screen.queryByText('Location')).not.toBeInTheDocument();
            expect(screen.queryByText('Parameter name')).not.toBeInTheDocument();
            expect(screen.queryByText('Prefix')).not.toBeInTheDocument();
        });

        test('handles missing additionalConfig gracefully', () => {
            const propsWithoutConfig = {
                ...defaultOAuthProps,
                additionalConfig: undefined
            };

            expect(() => {
                render(<AdditionalConfigurations {...propsWithoutConfig} />);
            }).not.toThrow();
        });

        test('handles missing oauthConfig gracefully', () => {
            const propsWithoutOAuthConfig = {
                ...defaultOAuthProps,
                additionalConfig: {}
            };

            expect(() => {
                render(<AdditionalConfigurations {...propsWithoutOAuthConfig} />);
            }).not.toThrow();
        });

        test('handles missing apiKeyConfig gracefully', () => {
            const propsWithoutApiKeyConfig = {
                ...defaultApiKeyProps,
                additionalConfig: {}
            };

            expect(() => {
                render(<AdditionalConfigurations {...propsWithoutApiKeyConfig} />);
            }).not.toThrow();
        });

        test('calls setNumFieldsInError when provided', () => {
            render(<AdditionalConfigurations {...defaultOAuthProps} />);

            expect(mockSetNumFieldsInError).toHaveBeenCalledWith(expect.any(Function));
        });

        test('handles missing setNumFieldsInError gracefully', () => {
            const propsWithoutErrorCallback = {
                ...defaultOAuthProps,
                setNumFieldsInError: undefined
            };

            expect(() => {
                render(<AdditionalConfigurations {...propsWithoutErrorCallback} />);
            }).not.toThrow();
        });
    });

    describe('Validation Integration', () => {
        test('validates empty scopes as valid', () => {
            const propsWithEmptyScope = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: [''],
                        customParameters: []
                    }
                }
            };

            render(<AdditionalConfigurations {...propsWithEmptyScope} />);

            expect(mockSetNumFieldsInError).toHaveBeenCalledWith(expect.any(Function));
        });

        test('handles targetIndex correctly in test IDs', () => {
            const customProps = {
                ...defaultOAuthProps,
                targetIndex: 5
            };

            render(<AdditionalConfigurations {...customProps} />);

            expect(screen.getByTestId('add-scope-6')).toBeInTheDocument();
            expect(screen.getByTestId('add-custom-param-6')).toBeInTheDocument();
        });
    });

    describe('User Interactions - OAuth', () => {
        test('adds new scope when add scope button is clicked', async () => {
            const user = userEvent.setup();
            render(<AdditionalConfigurations {...defaultOAuthProps} />);

            const addButton = screen.getByTestId('add-scope-1');
            await user.click(addButton);

            expect(mockOnConfigChange).toHaveBeenCalledWith({
                oauthConfig: {
                    scopes: [''],
                    customParameters: []
                }
            });
        });

        test('updates scope value when input changes', () => {
            const propsWithScope = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: ['read'],
                        customParameters: []
                    }
                }
            };

            render(<AdditionalConfigurations {...propsWithScope} />);

            const scopeInput = screen.getByTestId('oauth-scope-input-1-0').querySelector('input');
            fireEvent.change(scopeInput!, { target: { value: 'write' } });

            expect(mockOnConfigChange).toHaveBeenCalled();
        });

        test('removes scope when remove button is clicked', async () => {
            const propsWithScope = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: ['read', 'write'],
                        customParameters: []
                    }
                }
            };

            const user = userEvent.setup();
            render(<AdditionalConfigurations {...propsWithScope} />);

            const removeButton = screen.getByTestId('remove-scope-1-0');
            await user.click(removeButton);

            expect(mockOnConfigChange).toHaveBeenCalledWith({
                oauthConfig: {
                    scopes: ['write'],
                    customParameters: []
                }
            });
        });

        test('adds new custom parameter when add parameter button is clicked', async () => {
            const user = userEvent.setup();
            render(<AdditionalConfigurations {...defaultOAuthProps} />);

            const addButton = screen.getByTestId('add-custom-param-1');
            await user.click(addButton);

            expect(mockOnConfigChange).toHaveBeenCalledWith({
                oauthConfig: {
                    scopes: [],
                    customParameters: [{ key: '', value: '' }]
                }
            });
        });

        test('updates custom parameter key when input changes', () => {
            const propsWithParams = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: [],
                        customParameters: [{ key: '', value: '' }]
                    }
                }
            };

            render(<AdditionalConfigurations {...propsWithParams} />);

            const keyInput = screen.getByTestId('oauth-param-key-1-0').querySelector('input');
            fireEvent.change(keyInput!, { target: { value: 'client_id' } });

            expect(mockOnConfigChange).toHaveBeenCalled();
        });

        test('updates custom parameter value when input changes', () => {
            const propsWithParams = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: [],
                        customParameters: [{ key: 'client_id', value: '' }]
                    }
                }
            };

            render(<AdditionalConfigurations {...propsWithParams} />);

            const valueInput = screen.getByTestId('oauth-param-value-1-0').querySelector('input');
            fireEvent.change(valueInput!, { target: { value: 'my-client-id' } });

            expect(mockOnConfigChange).toHaveBeenCalled();
        });

        test('removes custom parameter when remove button is clicked', async () => {
            const propsWithParams = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: [],
                        customParameters: [
                            { key: 'client_id', value: 'id1' },
                            { key: 'client_secret', value: 'secret1' }
                        ]
                    }
                }
            };

            const user = userEvent.setup();
            render(<AdditionalConfigurations {...propsWithParams} />);

            const removeButton = screen.getByTestId('remove-param-1-0');
            await user.click(removeButton);

            expect(mockOnConfigChange).toHaveBeenCalledWith({
                oauthConfig: {
                    scopes: [],
                    customParameters: [{ key: 'client_secret', value: 'secret1' }]
                }
            });
        });
    });

    describe('User Interactions - API Key', () => {
        test('updates location when radio button is selected', async () => {
            const user = userEvent.setup();
            render(<AdditionalConfigurations {...defaultApiKeyProps} />);

            const queryRadio = screen.getByLabelText('Query parameter');
            await user.click(queryRadio);

            expect(mockOnConfigChange).toHaveBeenCalledWith({
                apiKeyConfig: {
                    location: API_KEY_LOCATION.QUERY,
                    parameterName: '',
                    prefix: ''
                }
            });
        });

        test('updates parameter name when input changes', () => {
            render(<AdditionalConfigurations {...defaultApiKeyProps} />);

            const paramInput = screen.getByTestId('api-key-param-name-1').querySelector('input');
            fireEvent.change(paramInput!, { target: { value: 'x-api-key' } });

            expect(mockOnConfigChange).toHaveBeenCalled();
        });

        test('updates prefix when input changes', () => {
            render(<AdditionalConfigurations {...defaultApiKeyProps} />);

            const prefixInput = screen.getByTestId('api-key-prefix-1').querySelector('input');
            fireEvent.change(prefixInput!, { target: { value: 'Bearer' } });

            expect(mockOnConfigChange).toHaveBeenCalled();
        });
    });

    describe('Error Handling and Validation', () => {
        test('shows scope validation errors', () => {
            const propsWithInvalidScope = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: ['invalid scope with spaces'],
                        customParameters: []
                    }
                }
            };

            render(<AdditionalConfigurations {...propsWithInvalidScope} />);

            expect(mockSetNumFieldsInError).toHaveBeenCalled();
        });

        test('shows custom parameter validation errors', () => {
            const propsWithInvalidParams = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: [],
                        customParameters: [
                            { key: '', value: 'some-value' },
                            { key: 'valid-key', value: '' }
                        ]
                    }
                }
            };

            render(<AdditionalConfigurations {...propsWithInvalidParams} />);

            expect(mockSetNumFieldsInError).toHaveBeenCalled();
        });

        test('shows API key validation errors', () => {
            const propsWithInvalidApiKey = {
                ...defaultApiKeyProps,
                additionalConfig: {
                    apiKeyConfig: {
                        location: API_KEY_LOCATION.HEADER,
                        parameterName: '',
                        prefix: 'a'.repeat(100) // Too long
                    }
                }
            };

            render(<AdditionalConfigurations {...propsWithInvalidApiKey} />);

            expect(mockSetNumFieldsInError).toHaveBeenCalled();
        });

        test('updates error count when scope validation changes', async () => {
            const propsWithScope = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: ['valid-scope'],
                        customParameters: []
                    }
                }
            };

            const user = userEvent.setup();
            render(<AdditionalConfigurations {...propsWithScope} />);

            const scopeInput = screen.getByTestId('oauth-scope-input-1-0');
            await user.tripleClick(scopeInput); // Select all text
            await user.type(scopeInput, 'invalid scope with spaces');

            expect(mockSetNumFieldsInError).toHaveBeenCalled();
        });

        test('updates error count when custom parameter validation changes', async () => {
            const propsWithParams = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: [],
                        customParameters: [{ key: 'valid-key', value: 'valid-value' }]
                    }
                }
            };

            const user = userEvent.setup();
            render(<AdditionalConfigurations {...propsWithParams} />);

            const keyInput = screen.getByTestId('oauth-param-key-1-0');
            await user.tripleClick(keyInput); // Select all text
            await user.keyboard('{Delete}'); // Delete the selected text

            expect(mockSetNumFieldsInError).toHaveBeenCalled();
        });

        test('updates error count when API key parameter name validation changes', async () => {
            const user = userEvent.setup();
            render(<AdditionalConfigurations {...defaultApiKeyProps} />);

            const paramInput = screen.getByTestId('api-key-param-name-1');
            await user.type(paramInput, 'a'.repeat(100)); // Too long

            expect(mockSetNumFieldsInError).toHaveBeenCalled();
        });

        test('updates error count when API key prefix validation changes', async () => {
            const user = userEvent.setup();
            render(<AdditionalConfigurations {...defaultApiKeyProps} />);

            const prefixInput = screen.getByTestId('api-key-prefix-1');
            await user.type(prefixInput, 'a'.repeat(100)); // Too long

            expect(mockSetNumFieldsInError).toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        test('handles undefined additionalConfig', () => {
            const propsWithoutConfig = {
                ...defaultOAuthProps,
                additionalConfig: undefined
            };

            expect(() => render(<AdditionalConfigurations {...propsWithoutConfig} />)).not.toThrow();
        });

        test('handles empty oauthConfig', () => {
            const propsWithEmptyConfig = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {}
                }
            };

            expect(() => render(<AdditionalConfigurations {...propsWithEmptyConfig} />)).not.toThrow();
        });

        test('handles empty apiKeyConfig', () => {
            const propsWithEmptyConfig = {
                ...defaultApiKeyProps,
                additionalConfig: {
                    apiKeyConfig: {}
                }
            };

            expect(() => render(<AdditionalConfigurations {...propsWithEmptyConfig} />)).not.toThrow();
        });

        test('does not add scope when at maximum limit', async () => {
            const maxScopes = Array(OAUTH_SCOPES_MAX_COUNT).fill('scope');
            const propsWithMaxScopes = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: maxScopes,
                        customParameters: []
                    }
                }
            };

            const user = userEvent.setup();
            render(<AdditionalConfigurations {...propsWithMaxScopes} />);

            const addButton = screen.getByTestId('add-scope-1');
            await user.click(addButton);

            // Should not call onConfigChange since we're at max
            expect(mockOnConfigChange).not.toHaveBeenCalled();
        });

        test('does not add custom parameter when at maximum limit', async () => {
            const maxParams = Array(OAUTH_CUSTOM_PARAMS_MAX_COUNT).fill({ key: 'key', value: 'value' });
            const propsWithMaxParams = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: [],
                        customParameters: maxParams
                    }
                }
            };

            const user = userEvent.setup();
            render(<AdditionalConfigurations {...propsWithMaxParams} />);

            const addButton = screen.getByTestId('add-custom-param-1');
            await user.click(addButton);

            // Should not call onConfigChange since we're at max
            expect(mockOnConfigChange).not.toHaveBeenCalled();
        });

        test('handles scope removal with error count updates', async () => {
            const propsWithScopeErrors = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: ['invalid scope', 'valid-scope'],
                        customParameters: []
                    }
                }
            };

            const user = userEvent.setup();
            render(<AdditionalConfigurations {...propsWithScopeErrors} />);

            const removeButton = screen.getByTestId('remove-scope-1-0');
            await user.click(removeButton);

            expect(mockSetNumFieldsInError).toHaveBeenCalled();
            expect(mockOnConfigChange).toHaveBeenCalledWith({
                oauthConfig: {
                    scopes: ['valid-scope'],
                    customParameters: []
                }
            });
        });

        test('handles custom parameter removal with error count updates', async () => {
            const propsWithParamErrors = {
                ...defaultOAuthProps,
                additionalConfig: {
                    oauthConfig: {
                        scopes: [],
                        customParameters: [
                            { key: '', value: 'invalid' },
                            { key: 'valid', value: 'valid' }
                        ]
                    }
                }
            };

            const user = userEvent.setup();
            render(<AdditionalConfigurations {...propsWithParamErrors} />);

            const removeButton = screen.getByTestId('remove-param-1-0');
            await user.click(removeButton);

            expect(mockSetNumFieldsInError).toHaveBeenCalled();
            expect(mockOnConfigChange).toHaveBeenCalledWith({
                oauthConfig: {
                    scopes: [],
                    customParameters: [{ key: 'valid', value: 'valid' }]
                }
            });
        });
    });
});
