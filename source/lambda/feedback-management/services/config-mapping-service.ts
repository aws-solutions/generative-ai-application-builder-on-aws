// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DEFAULT_PARAMETER_MAPPING } from '../utils/constants';
import { JSONPath } from 'jsonpath-plus';
import { logger, tracer } from '../power-tools-init';

/**
 * Interface defining the structure of parameter mapping configuration
 */
interface ParameterMappingConfig {
    enabled: boolean;
    parameterMappings: Record<string, string>;
    customMappings?: Record<string, string>;
}

/**
 * Service class for handling configuration mapping functionality
 */
export class ConfigMappingService {
    private static readonly DEFAULT_CONFIG: ParameterMappingConfig = {
        enabled: true,
        parameterMappings: DEFAULT_PARAMETER_MAPPING,
        customMappings: {}
    };

    /**
     * Validates a parameter mapping path against a config object
     * Useful for testing if a path will resolve to a value
     *
     * @param config The configuration object to validate against
     * @param path The JSONPath or dot notation path to validate
     * @returns Object containing validation result and resolved value if successful
     */
    validateMappingPath(
        config: Record<string, any>,
        path: string
    ): {
        valid: boolean;
        value?: any;
        error?: string;
    } {
        if (!path || typeof path !== 'string') {
            return { valid: false, error: 'Path must be a non-empty string' };
        }

        try {
            const value = ConfigMappingService.getNestedValue(config, path);

            if (value === undefined) {
                return { valid: false, error: 'Path does not resolve to a value' };
            }

            return { valid: true, value };
        } catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Unknown error during validation'
            };
        }
    }

    /**
     * Gets parameter mapping configuration from the use case config
     *
     * @param useCaseConfig The use case configuration object
     * @returns Configuration containing parameter mappings
     */
    getParameterMappings(useCaseConfig: Record<string, any>): ParameterMappingConfig {
        if (!useCaseConfig.FeedbackParams) {
            logger.debug('No FeedbackParams found in use case config, using default config');
            return ConfigMappingService.DEFAULT_CONFIG;
        }

        if (!this.isFeedbackEnabled(useCaseConfig.FeedbackParams)) {
            return this.getDisabledConfig();
        }

        return this.buildConfigWithMappings(useCaseConfig.FeedbackParams);
    }

    /**
     * Checks if feedback is enabled in the feedback parameters
     *
     * @param feedbackParams The feedback parameters object
     * @returns True if feedback is enabled, false otherwise
     */
    private isFeedbackEnabled(feedbackParams: Record<string, any>): boolean {
        return feedbackParams.FeedbackEnabled !== false;
    }

    /**
     * Returns a disabled configuration with default values
     *
     * @returns Disabled parameter mapping configuration
     */
    private getDisabledConfig(): ParameterMappingConfig {
        return {
            ...ConfigMappingService.DEFAULT_CONFIG,
            enabled: false
        };
    }

    /**
     * Builds configuration object with parameter mappings
     *
     * @param feedbackParams The feedback parameters object
     * @returns Parameter mapping configuration
     */
    private buildConfigWithMappings(feedbackParams: Record<string, any>): ParameterMappingConfig {
        const config: ParameterMappingConfig = {
            enabled: true,
            parameterMappings: DEFAULT_PARAMETER_MAPPING,
            customMappings: {}
        };

        if (feedbackParams.CustomMappings) {
            config.customMappings = this.processCustomMappings(feedbackParams.CustomMappings);
        }

        return config;
    }

    /**
     * Processes and validates custom mappings from feedback parameters
     *
     * @param customMappings The custom mappings object
     * @returns Record of validated custom mappings
     */
    private processCustomMappings(customMappings: any): Record<string, string> {
        try {
            if (!this.isValidCustomMappingsObject(customMappings)) {
                logger.warn('CustomMappings is not an object, ignoring', {
                    type: typeof customMappings
                });
                return {};
            }

            const validCustomMappings = this.filterValidMappings(customMappings);

            logger.debug(
                `Custom mappings loaded. Valid Custom Mappings: ${validCustomMappings} with length: ${Object.keys(validCustomMappings).length}`
            );

            return validCustomMappings;
        } catch (error) {
            const rootTraceId = tracer.getRootXrayTraceId();
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Error processing custom mappings. Error ${errorMessage}`, {
                errorStack: error instanceof Error ? error.stack : undefined,
                traceId: rootTraceId
            });
            return {};
        }
    }

    /**
     * Validates that custom mappings is a valid object
     *
     * @param customMappings The custom mappings to validate
     * @returns True if valid object, false otherwise
     */
    private isValidCustomMappingsObject(customMappings: any): boolean {
        return typeof customMappings === 'object' && customMappings !== null;
    }

    /**
     * Filters and validates mapping values
     *
     * @param mappings The mappings to filter and validate
     * @returns Record of valid string mappings
     */
    private filterValidMappings(mappings: Record<string, any>): Record<string, string> {
        const validCustomMappings: Record<string, string> = {};

        Object.entries(mappings).forEach(([key, value]) => {
            if (typeof value === 'string') {
                validCustomMappings[key] = value;
            } else {
                logger.warn('Invalid custom mapping value, must be a string', {
                    key,
                    valueType: typeof value
                });
            }
        });

        return validCustomMappings;
    }

    /**
     * Extracts a nested value from an object using JSONPath notation
     *
     * @param obj The object to extract value from
     * @param path JSONPath or dot notation path to the value
     * @returns The extracted value or undefined if not found
     */
    static getNestedValue(obj: any, path: string): any {
        if (!path || path === '') {
            return obj;
        }

        if (!obj) {
            return undefined;
        }

        // Convert dot notation to JSONPath format
        const jsonPath = path.startsWith('$') ? path : `$.${path}`;

        try {
            const results = JSONPath({ path: jsonPath, json: obj });

            // Handle array results
            if (results.length > 1) {
                logger.debug('Multiple values found for path, returning array', {
                    path,
                    count: results.length
                });
                return results;
            }

            return results.length > 0 ? results[0] : undefined;
        } catch (error) {
            logger.warn('Error extracting value with JSONPath', {
                path,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return undefined;
        }
    }

    /**
     * Extracts attributes from a use case configuration using parameter mappings
     * Can be used for metrics dimensions or enriching data objects
     *
     * @param useCaseConfig The use case configuration object
     * @returns Object containing extracted standard and custom attribute name-value pairs
     */
    extractConfigAttributes(useCaseConfig: Record<string, any>): {
        attributes: Record<string, string>;
        customAttributes: Record<string, string>;
    } {
        if (!this.isValidConfig(useCaseConfig)) {
            return { attributes: {}, customAttributes: {} };
        }

        const config = this.getParameterMappings(useCaseConfig);

        if (!config.enabled) {
            logger.debug('Parameter mapping disabled in config');
            return { attributes: {}, customAttributes: {} };
        }

        const attributes = this.extractStandardAttributes(useCaseConfig, config);
        const customAttributes = this.extractCustomAttributes(useCaseConfig, config);

        logger.debug(
            `Config attributes extracted. Standard attributes count: ${Object.keys(attributes).length} and custom attributes count: ${Object.keys(customAttributes).length}`
        );

        return { attributes, customAttributes };
    }

    /**
     * Validates that the use case config is valid
     *
     * @param useCaseConfig The use case config to validate
     * @returns True if valid, false otherwise
     */
    private isValidConfig(useCaseConfig: Record<string, any>): boolean {
        if (!useCaseConfig) {
            logger.warn('No use case config provided');
            return false;
        }
        return true;
    }

    /**
     * Extracts standard attributes from the use case config using parameter mappings
     *
     * @param useCaseConfig The use case configuration object
     * @param config The parameter mapping configuration
     * @returns Record of extracted standard attributes
     */
    private extractStandardAttributes(
        useCaseConfig: Record<string, any>,
        config: ParameterMappingConfig
    ): Record<string, string> {
        const attributes: Record<string, string> = {};

        logger.debug(
            `Applying standard parameter mappings. Received total ${Object.keys(config.parameterMappings).length} parameter mappings.`
        );

        for (const [attributeName, sourcePath] of Object.entries(config.parameterMappings)) {
            const value = ConfigMappingService.getNestedValue(useCaseConfig, sourcePath);
            this.processAndAddAttribute(attributes, attributeName, value, sourcePath);
        }

        return attributes;
    }

    /**
     * Extracts custom attributes from the use case config using custom mappings
     *
     * @param useCaseConfig The use case configuration object
     * @param config The parameter mapping configuration
     * @returns Record of extracted custom attributes
     */
    private extractCustomAttributes(
        useCaseConfig: Record<string, any>,
        config: ParameterMappingConfig
    ): Record<string, string> {
        const customAttributes: Record<string, string> = {};

        if (!config.customMappings || Object.keys(config.customMappings).length === 0) {
            return customAttributes;
        }

        logger.debug('Applying custom parameter mappings', {
            count: Object.keys(config.customMappings).length
        });

        for (const [customKey, sourcePath] of Object.entries(config.customMappings)) {
            this.processCustomMapping(useCaseConfig, customAttributes, customKey, sourcePath);
        }

        return customAttributes;
    }

    /**
     * Processes a single custom mapping
     *
     * @param useCaseConfig The use case configuration object
     * @param customAttributes The custom attributes object to populate
     * @param customKey The key for the custom attribute
     * @param sourcePath The source path to extract the value from
     */
    private processCustomMapping(
        useCaseConfig: Record<string, any>,
        customAttributes: Record<string, string>,
        customKey: string,
        sourcePath: any
    ): void {
        if (typeof sourcePath !== 'string') {
            logger.warn('Invalid source path in custom mapping', {
                customKey,
                sourcePath
            });
            return;
        }

        try {
            const value = ConfigMappingService.getNestedValue(useCaseConfig, sourcePath);
            this.processAndAddAttribute(customAttributes, customKey, value, sourcePath);
        } catch (error) {
            logger.warn('Error processing custom mapping', {
                customKey,
                sourcePath,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Helper method to process a value and add it to an attributes object
     *
     * @param attributes Object to add the processed attribute to
     * @param attributeName Name of the attribute
     * @param value Value to process
     * @param sourcePath Original source path (for logging)
     */
    private processAndAddAttribute(
        attributes: Record<string, string>,
        attributeName: string,
        value: any,
        sourcePath: string
    ): void {
        // Skip undefined values
        if (value === undefined) {
            logger.debug(
                `Skipping attribute: ${attributeName} with sourcePath: ${sourcePath} because value is undefined`
            );
            return;
        }

        try {
            if (typeof value === 'string') {
                attributes[attributeName] = value;
            } else if (typeof value === 'number') {
                attributes[attributeName] = String(value);
            } else if (typeof value === 'boolean') {
                attributes[attributeName] = value ? 'true' : 'false';
            } else if (Array.isArray(value)) {
                attributes[attributeName] = JSON.stringify(value);
            } else if (typeof value === 'object' && value !== null) {
                attributes[attributeName] = JSON.stringify(value);
            } else {
                attributes[attributeName] = String(value);
            }

            logger.debug(`Processed attribute: ${attributeName} with sourcePath: ${sourcePath}`, {
                valueType: typeof value,
                isArray: Array.isArray(value)
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.warn(
                `Failed to convert value to string. Attribute: ${attributeName} with sourcePath: ${sourcePath}. Error: ${errorMessage}`,
                {
                    valueType: typeof value
                }
            );
        }
    }
}
