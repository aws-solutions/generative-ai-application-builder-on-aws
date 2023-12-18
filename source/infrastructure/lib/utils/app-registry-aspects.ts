#!/usr/bin/env node
/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import * as appreg from '@aws-cdk/aws-servicecatalogappregistry-alpha';
import * as cdk from 'aws-cdk-lib';
import { CfnResourceAssociation } from 'aws-cdk-lib/aws-servicecatalogappregistry';
import { Construct, IConstruct } from 'constructs';
import { hashValues } from './common-utils';

export interface AppRegistryProps {
    /**
     * Name of the solution as set through from cdk.json
     */
    solutionName: string;

    /**
     * Name of the application used to create an entry in AppRegistry as set through cdk.json
     */
    applicationName: string;

    /**
     * Solution ID associated with the application
     */
    solutionID: string;
    /**
     * Solution version of the application
     */
    solutionVersion: string;
    /**
     * An application type attribute initialized in the constructor of this class
     */
    applicationType: string;
}

/**
 * A CDK Aspect to add App Registry constructs
 */
export class AppRegistry extends Construct implements cdk.IAspect {
    /**
     * Name of the solution as set through from cdk.json
     */
    private solutionName: string;

    /**
     * Name of the application used to create an entry in AppRegistry as set through cdk.json
     */
    private applicationName: string;

    /**
     * Solution ID as set through cdk.json
     */
    private solutionID: string;

    /**
     * Solution version as set through cdk.json
     */
    private solutionVersion: string;

    /**
     * An application type attribute initialized in the constructor of this class
     */
    private applicationType: string;

    /**
     * The instance of application that the solution stacks should be associated with
     */
    private application: Map<string, appreg.Application>;

    /**
     * The instance of attribute group that the solution stacks should be associated with
     */
    private attributeGroup: appreg.AttributeGroup;

    constructor(scope: Construct, id: string, props: AppRegistryProps) {
        super(scope, id);
        this.solutionName = props.solutionName;
        this.applicationName = `App-${props.applicationName}`;
        this.solutionID = props.solutionID;
        this.solutionVersion = props.solutionVersion;
        this.applicationType = props.applicationType;
        this.application = new Map();
    }

    /**
     * Method invoked as a `Visitor` pattern to inject aspects during cdk synthesis
     *
     * @param node
     */
    public visit(node: IConstruct): void {
        if (node instanceof cdk.Stack) {
            if (!node.nested) {
                // parent stack
                if (!this.application.get(node.stackId)) {
                    this.createAppForAppRegistry(node);
                }
                const stack = node;
                this.application.get(node.stackId)!.associateApplicationWithStack(stack);
                if (!this.attributeGroup) {
                    this.createAttributeGroup(node);
                }
                this.addTagsforApplication(node);
            } else {
                if (!this.application.get(node.nestedStackParent!.stackId)) {
                    this.createAppForAppRegistry(node.nestedStackParent!);
                }

                const nestedStack = node;
                new CfnResourceAssociation(
                    nestedStack,
                    `ResourceAssociation${hashValues(cdk.Names.nodeUniqueId(nestedStack.node))}`,
                    {
                        application: this.application.get(node.nestedStackParent!.stackId)!.applicationId,
                        resource: node.stackId,
                        resourceType: 'CFN_STACK'
                    }
                );

                (nestedStack.node.defaultChild as cdk.CfnResource).addDependency(
                    this.application.get(node.nestedStackParent!.stackId)!.node.defaultChild as cdk.CfnResource
                );
            }
        }
    }

    /**
     * Method to initialize an Application in AppRegistry service
     *
     * @returns - Instance of AppRegistry's Application class
     */
    private createAppForAppRegistry(stack: cdk.Stack): void {
        this.application.set(
            stack.stackId,
            new appreg.Application(stack, 'RegistrySetup', {
                applicationName: this.applicationNameValue,
                description: `Service Catalog application to track and manage all your resources for the solution ${this.solutionName}`
            })
        );
    }

    private get applicationNameValue(): string {
        return `${this.applicationName}-${cdk.Aws.STACK_NAME}`;
    }

    /**
     * Method to add tags to the AppRegistry's Application instance
     *
     */
    private addTagsforApplication(node: cdk.Stack): void {
        if (!this.application.get(node.stackId)) {
            this.createAppForAppRegistry(node);
        }

        cdk.Tags.of(this.application.get(node.stackId)!).add('Solutions:SolutionID', this.solutionID);
        cdk.Tags.of(this.application.get(node.stackId)!).add('Solutions:SolutionName', this.solutionName);
        cdk.Tags.of(this.application.get(node.stackId)!).add('Solutions:SolutionVersion', this.solutionVersion);
        cdk.Tags.of(this.application.get(node.stackId)!).add('Solutions:ApplicationType', this.applicationType);
    }

    /**
     * Method to create AttributeGroup to be associated with the Application's instance in AppRegistry
     *
     */
    private createAttributeGroup(node: cdk.Stack): void {
        if (!this.application.get(node.stackId)) {
            this.createAppForAppRegistry(node);
        }
        this.attributeGroup = new appreg.AttributeGroup(node, 'AppAttributes', {
            attributeGroupName: `AttrGrp-${cdk.Aws.STACK_NAME}`,
            description: 'Attributes for Solutions Metadata',
            attributes: {
                applicationType: this.applicationType,
                version: this.solutionVersion,
                solutionID: this.solutionID,
                solutionName: this.solutionName
            }
        });
        this.attributeGroup.associateWith(this.application.get(node.stackId)!);
    }
}
