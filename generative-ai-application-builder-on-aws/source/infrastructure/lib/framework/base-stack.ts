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

/**
 * Base stack properties that all stacks should supply as part of stack creation
 */
export interface BaseStackProps extends cdk.StackProps {
    /**
     * The ID associated with the solution
     */
    solutionID: string;
    /**
     * The version of the solution being deployed
     */
    solutionVersion: string;
    /**
     * registered trademark name of the solution
     */
    solutionName: string;

    /**
     * The trademark name of the solution
     */
    applicationTrademarkName: string;
}

/**
 * Base stack class which all (root/ parent) stacks should extend
 */
export class BaseStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);
    }
}
