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
import { getCommandsForPythonDockerBuild } from '../utils/asset-bundling';
import { LayerProps, localBundling } from '../utils/common-utils';
import { COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME } from '../utils/constants';

/**
 * A class that defines user-agent layer for Python runtimes
 */
export class PythonUserAgentLayer extends lambda.LayerVersion {
    constructor(scope: Construct, id: string, props: LayerProps) {
        const compatibleRuntimes = props.compatibleRuntimes ?? [
            lambda.Runtime.PYTHON_3_8,
            lambda.Runtime.PYTHON_3_9,
            lambda.Runtime.PYTHON_3_10,
            lambda.Runtime.PYTHON_3_11
        ];

        for (const runtime of compatibleRuntimes) {
            if (runtime && runtime.family !== lambda.RuntimeFamily.PYTHON) {
                throw new Error(`Only ${compatibleRuntimes.join(',')} runtimes are supported`);
            }
        }

        const entry = path.resolve(props.entry);

        super(scope, id, {
            code: lambda.Code.fromAsset(entry, {
                bundling: {
                    image: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME.bundlingImage,
                    local: {
                        tryBundle(outputDir: string) {
                            const cliCommand = [
                                `cd ${entry}`,
                                'echo "Trying local bundling of python modules"',
                                'rm -fr .venv*',
                                `pip3 install -r requirements.txt --target ${outputDir}/python/`,
                                `rm -fr ${outputDir}/python/boto*`
                            ].join(' && ');
                            const targetDirectory = `${outputDir}/python/`;
                            return localBundling(cliCommand, entry, targetDirectory);
                        }
                    },
                    command: getCommandsForPythonDockerBuild('/asset-output/python', 'python user-agent lambda layer'),
                    user: 'root'
                }
            }),
            compatibleRuntimes,
            description: props.description
        } as lambda.LayerVersionProps);
    }
}
