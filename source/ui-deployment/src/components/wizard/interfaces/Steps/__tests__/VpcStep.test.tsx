// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, beforeEach } from 'vitest';
import { VpcStep } from '../VpcStep';
import { DEPLOYMENT_ACTIONS } from '../../../../../utils/constants';
import { validateBaseWizardProps, testBaseWizardPropsCompliance } from './test-utils';

describe('VpcStep', () => {
    let vpcStep: VpcStep;

    beforeEach(() => {
        vpcStep = new VpcStep();
    });

    test('initializes with correct default properties', () => {
        expect(vpcStep.id).toBe('vpc');
        expect(vpcStep.title).toBe('Select network configuration');
        
        // Test BaseWizardProps compliance - this will fail if BaseWizardProps changes
        validateBaseWizardProps(vpcStep.props);
        
        expect(vpcStep.props.inError).toBe(false);
        expect(vpcStep.props.isVpcRequired).toBeDefined();
        expect(vpcStep.props.existingVpc).toBeDefined();
        expect(vpcStep.props.vpcId).toBeDefined();
        expect(vpcStep.props.subnetIds).toBeDefined();
        expect(vpcStep.props.securityGroupIds).toBeDefined();
    });

    test('implements BaseWizardProps interface correctly', () => {
        // This test ensures that if BaseWizardProps interface changes, 
        // the test will fail and force developers to update implementations
        testBaseWizardPropsCompliance(vpcStep);
    });

    test('has correct tool content', () => {
        expect(vpcStep.toolContent.title).toBe('Select VPC Configuration');
        expect(vpcStep.toolContent.content).toBeDefined();
        expect(vpcStep.toolContent.links).toBeDefined();
        expect(vpcStep.toolContent.links.length).toBeGreaterThan(0);
    });

    test('has content generator function', () => {
        expect(typeof vpcStep.contentGenerator).toBe('function');
    });

    test('visibility is initially null', () => {
        expect(vpcStep.visibility).toBeNull();
    });

    describe('mapStepInfoFromDeployment', () => {
        test('maps deployment info correctly when VPC is enabled', () => {
            const mockDeployment = {
                vpcEnabled: 'Yes',
                createNewVpc: 'No',
                vpcId: 'vpc-12345',
                privateSubnetIds: ['subnet-abc123', 'subnet-def456'],
                securityGroupIds: ['sg-789xyz']
            };

            vpcStep.mapStepInfoFromDeployment(mockDeployment, DEPLOYMENT_ACTIONS.EDIT);

            expect(vpcStep.props.isVpcRequired).toBe(true);
            expect(vpcStep.props.existingVpc).toBe(true);
            expect(vpcStep.props.vpcId).toBe('vpc-12345');
            expect(vpcStep.props.subnetIds).toEqual([{ key: 'subnet-abc123' }, { key: 'subnet-def456' }]);
            expect(vpcStep.props.securityGroupIds).toEqual([{ key: 'sg-789xyz' }]);
        });

        test('maps deployment info correctly when VPC is disabled', () => {
            const mockDeployment = {
                vpcEnabled: 'No'
            };

            vpcStep.mapStepInfoFromDeployment(mockDeployment, DEPLOYMENT_ACTIONS.EDIT);

            expect(vpcStep.props.isVpcRequired).toBe(false);
        });

        test('maps deployment info correctly when creating new VPC', () => {
            const mockDeployment = {
                vpcEnabled: 'Yes',
                createNewVpc: 'Yes',
                privateSubnetIds: [],
                securityGroupIds: []
            };

            vpcStep.mapStepInfoFromDeployment(mockDeployment, DEPLOYMENT_ACTIONS.EDIT);

            expect(vpcStep.props.isVpcRequired).toBe(true);
            expect(vpcStep.props.existingVpc).toBe(false);
        });

        test('handles empty deployment data', () => {
            const originalProps = { ...vpcStep.props };
            
            vpcStep.mapStepInfoFromDeployment(null, DEPLOYMENT_ACTIONS.EDIT);

            // Should maintain default values when deployment is null
            expect(vpcStep.props).toEqual(originalProps);
        });

        test('handles deployment without VPC params', () => {
            const originalProps = { ...vpcStep.props };
            
            vpcStep.mapStepInfoFromDeployment({}, DEPLOYMENT_ACTIONS.EDIT);

            // Should maintain default values when params are missing
            expect(vpcStep.props).toEqual(originalProps);
        });

        test('handles partial VPC configuration', () => {
            const mockDeployment = {
                vpcEnabled: 'Yes',
                createNewVpc: 'No',
                vpcId: 'vpc-partial',
                privateSubnetIds: [],
                securityGroupIds: []
            };

            vpcStep.mapStepInfoFromDeployment(mockDeployment, DEPLOYMENT_ACTIONS.EDIT);

            expect(vpcStep.props.isVpcRequired).toBe(true);
            expect(vpcStep.props.existingVpc).toBe(true);
            expect(vpcStep.props.vpcId).toBe('vpc-partial');
            expect(vpcStep.props.subnetIds).toEqual([]);
            expect(vpcStep.props.securityGroupIds).toEqual([]);
        });
    });
});