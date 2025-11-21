// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { BaseWizardProps } from '../BaseWizardStep';

/**
 * Expected properties in BaseWizardProps - UPDATE THIS WHEN BaseWizardProps CHANGES
 * This list must be manually maintained to ensure tests fail when BaseWizardProps is modified
 */
const EXPECTED_BASE_WIZARD_PROPS = [
    'inError'
] as const;

/**
 * Expected property types for BaseWizardProps - UPDATE THIS WHEN BaseWizardProps CHANGES
 */
const EXPECTED_BASE_WIZARD_PROP_TYPES: Record<string, string> = {
    'inError': 'boolean'
};

/**
 * Helper function to validate BaseWizardProps interface compliance
 * This ensures that all step classes properly implement the required base properties
 * 
 * IMPORTANT: This test will FAIL if you add new properties to BaseWizardProps
 * without updating EXPECTED_BASE_WIZARD_PROPS and EXPECTED_BASE_WIZARD_PROP_TYPES above
 */
export const validateBaseWizardProps = (props: any) => {
    // Check that all expected BaseWizardProps properties exist
    EXPECTED_BASE_WIZARD_PROPS.forEach(propName => {
        expect(props).toHaveProperty(propName);
        
        // Check property types
        const expectedType = EXPECTED_BASE_WIZARD_PROP_TYPES[propName];
        if (expectedType) {
            expect(typeof props[propName]).toBe(expectedType);
        }
    });
    
    // Create a BaseWizardProps instance to get the actual properties
    const basePropsInstance = new (class extends BaseWizardProps {})();
    const actualBaseProps = Object.getOwnPropertyNames(basePropsInstance);
    
    // Verify that our expected list matches the actual BaseWizardProps properties
    // This will fail if someone adds a property to BaseWizardProps without updating the test
    actualBaseProps.forEach(actualProp => {
        if (!EXPECTED_BASE_WIZARD_PROPS.includes(actualProp as any)) {
            throw new Error(
                `New property '${actualProp}' found in BaseWizardProps but not in EXPECTED_BASE_WIZARD_PROPS. ` +
                `Please update EXPECTED_BASE_WIZARD_PROPS and EXPECTED_BASE_WIZARD_PROP_TYPES in test-utils.ts`
            );
        }
    });
    
    // Also verify that we don't have extra properties in our expected list
    EXPECTED_BASE_WIZARD_PROPS.forEach(expectedProp => {
        if (!actualBaseProps.includes(expectedProp)) {
            throw new Error(
                `Expected property '${expectedProp}' not found in BaseWizardProps. ` +
                `Please update EXPECTED_BASE_WIZARD_PROPS in test-utils.ts`
            );
        }
    });
};

/**
 * Test that validates a step class implements BaseWizardProps interface correctly
 * This test will fail if BaseWizardProps interface changes and implementations don't match
 */
export const testBaseWizardPropsCompliance = (stepInstance: any) => {
    validateBaseWizardProps(stepInstance.props);
    
    // Verify the step props can be assigned to BaseWizardProps type
    const baseProps: BaseWizardProps = stepInstance.props;
    expect(baseProps).toBeDefined();
    
    // Additional validation: ensure all BaseWizardProps properties are properly initialized
    EXPECTED_BASE_WIZARD_PROPS.forEach(propName => {
        expect(stepInstance.props[propName]).toBeDefined();
    });
};