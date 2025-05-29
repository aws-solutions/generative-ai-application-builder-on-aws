// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from 'vitest';
import i18n from '../../i18n/i18n';

describe('i18n configuration', () => {
    beforeEach(() => {
        // Reset i18n instance before each test
        i18n.init({
            lng: 'en',
            fallbackLng: 'en',
            resources: {
                en: {
                    translation: {
                        // Add some test translations
                        'test.key': 'Test Value',
                        'test.interpolation': 'Hello {{name}}'
                    }
                },
                es: {
                    translation: {
                        'test.key': 'Valor de Prueba',
                        'test.interpolation': 'Hola {{name}}'
                    }
                }
            }
        });
    });

    it('should initialize with English as default language', () => {
        expect(i18n.language).toBe('en');
    });

    it('should have English as fallback language', () => {
        expect(i18n.options.fallbackLng).toEqual(['en']);
    });

    it('should translate a key correctly in English', () => {
        expect(i18n.t('test.key')).toBe('Test Value');
    });

    it('should handle interpolation correctly', () => {
        expect(i18n.t('test.interpolation', { name: 'John' })).toBe('Hello John');
    });

    it('should change language successfully', () => {
        i18n.changeLanguage('es');
        expect(i18n.language).toBe('es');
        expect(i18n.t('test.key')).toBe('Valor de Prueba');
    });

    it('should fall back to English for missing translations', () => {
        i18n.changeLanguage('fr'); // Language without translations
        expect(i18n.t('test.key')).toBe('Test Value');
    });

    it('should return key if translation is missing', () => {
        expect(i18n.t('missing.key')).toBe('missing.key');
    });

    it('should handle nested translation objects', () => {
        i18n.init({
            lng: 'en',
            resources: {
                en: {
                    translation: {
                        nested: {
                            key: 'Nested Value'
                        }
                    }
                }
            }
        });
        expect(i18n.t('nested.key')).toBe('Nested Value');
    });

    it('should handle array of keys', () => {
        const keys = ['test.key', 'test.interpolation'];
        const translations = keys.map((key) => i18n.t(key, { name: 'John' }));
        expect(translations).toEqual(['Test Value', 'Hello John']);
    });

    it('should maintain translations after language change', () => {
        i18n.changeLanguage('es');
        expect(i18n.t('test.interpolation', { name: 'Juan' })).toBe('Hola Juan');
        i18n.changeLanguage('en');
        expect(i18n.t('test.interpolation', { name: 'John' })).toBe('Hello John');
    });
});
