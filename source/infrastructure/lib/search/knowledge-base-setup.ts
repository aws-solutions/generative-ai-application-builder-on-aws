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

import * as cdk from 'aws-cdk-lib';

import { Construct } from 'constructs';

import { KendraKnowledgeBase } from './kendra-knowledge-base';

export interface KnowledgeBaseProps {
    /**
     * UUID to identify this deployed use case within an application.
     * Will be added to the kendra index name if one is deployed.
     */
    useCaseUUID: string;

    /**
     * The existing Kendra Index ID, if one exists. Should be an empty string if we wish to create a new index.
     */
    existingKendraIndexId: string;

    /**
     * The name of the new Kendra index
     */
    newKendraIndexName: string;

    /**
     * The number of query capacity units to set for the new Kendra index
     */
    newKendraQueryCapacityUnits: number;

    /**
     * The number of storage capacity units to set for the new Kendra index
     */
    newKendraStorageCapacityUnits: number;

    /**
     * The edition of the new Kendra index
     */
    newKendraIndexEdition: string;

    /**
     * Whether or not to deploy the Kendra index conditionally
     */
    deployKendraIndexCondition: cdk.CfnCondition;
}

/**
 * A construct that provisions indexed storage options using Kendra
 */
export class KnowledgeBaseSetup extends Construct {
    /**
     * Nested stack that creates a new kendra index
     */
    public readonly kendraKnowledgeBase: KendraKnowledgeBase;

    /**
     * Kendra index iD for the newly created kendra index, or the existing index referenced by existingKendraIndexId
     */
    public readonly kendraIndexId: string;

    constructor(scope: Construct, id: string, props: KnowledgeBaseProps) {
        super(scope, id);

        this.kendraKnowledgeBase = new KendraKnowledgeBase(this, 'KendraKnowledgeBase', {
            parameters: {
                UseCaseUUID: props.useCaseUUID,
                KendraIndexName: props.newKendraIndexName,
                QueryCapacityUnits: props.newKendraQueryCapacityUnits.toString(),
                StorageCapacityUnits: props.newKendraStorageCapacityUnits.toString(),
                KendraIndexEdition: props.newKendraIndexEdition
            },
            description: 'Nested Stack that creates the Kendra Index'
        });
        (this.kendraKnowledgeBase.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            props.deployKendraIndexCondition;

        // sets the value of kendraIndexId to the Kendra index ID if one was created, otherwise sets it to the empty string
        this.kendraIndexId = cdk.Fn.conditionIf(
            props.deployKendraIndexCondition.logicalId,
            this.kendraKnowledgeBase.kendraKnowledgeBaseIndex.attrId,
            props.existingKendraIndexId
        ).toString();
    }
}
