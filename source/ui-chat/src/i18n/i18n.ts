// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * This module initializes and configures i18next for internationalization.
 * It sets up language detection and React integration for the application.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import I18nextBrowserLanguageDetector from 'i18next-browser-languagedetector';

// Import translation files for supported languages
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import frTranslations from './locales/fr.json';

/**
 * Initialize i18next with:
 * - Browser language detection
 * - React integration
 * - English, Spanish and French translations
 * - English as default and fallback language
 * - HTML escaping disabled for interpolation
 */
i18n.use(I18nextBrowserLanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: enTranslations },
            es: { translation: esTranslations },
            fr: { translation: frTranslations }
        },
        lng: 'en', // default language
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
