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

import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as path from 'path';
import { getCommandForTypescriptLayerDockerBuild } from '../utils/asset-bundling';
import { LayerProps, getTSLayerLocalBundling } from '../utils/common-utils';
import { COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME, GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME } from '../utils/constants';

/**
 * A class the defines the user-agent layer Construct for TypeScript specific packaging
 */
export class TSUserAgentLayer extends lambda.LayerVersion {
    constructor(scope: Construct, id: string, props: LayerProps) {
        const compatibleRuntimes = props.compatibleRuntimes ?? [
            GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME,
            COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME
        ];

        for (const runtime of compatibleRuntimes) {
            if (runtime && runtime.family !== lambda.RuntimeFamily.NODEJS) {
                throw new Error(`Only ${compatibleRuntimes.join(',')} runtimes are supported`);
            }
        }

        const entry = path.resolve(props.entry);

        super(scope, id, {
            code: lambda.Code.fromAsset(entry, {
                bundling: {
                    image: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.bundlingImage,
                    user: 'root',
                    local: getTSLayerLocalBundling(entry),
                    command: getCommandForTypescriptLayerDockerBuild(
                        `/asset-output/nodejs/node_modules/${path.basename(entry)}`,
                        'node user-agent lambda layer'
                    )
                }
            }),
            compatibleRuntimes,
            description: props.description
        } as lambda.LayerVersionProps);
    }
}
