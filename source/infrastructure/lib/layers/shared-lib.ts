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
import {
    PipInstallArguments,
    getCommandsForPythonDockerBuildWithPlatform,
    resolvePipOptions
} from '../utils/asset-bundling';
import { localBundling } from '../utils/common-utils';
import { COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME } from '../utils/constants';

export interface SharedLibLayerProps {
    /**
     * The path to the root directory of the lambda layer.
     */
    readonly entry: string;

    /**
     * The runtimes compatible with the python layer.
     *
     * @default - All runtimes are supported.
     */
    readonly compatibleRuntimes?: lambda.Runtime[];

    /**
     * Path to lock file
     */
    readonly depsLockFilePath?: string;

    /**
     * Description of the lambda layer
     */
    readonly description?: string;

    /**
     * Options for install to be used only by PythonLangchainLayer
     */
    readonly pipOptions?: PipInstallArguments;
}

export class PythonLangchainLayer extends lambda.LayerVersion {
    constructor(scope: Construct, id: string, props: SharedLibLayerProps) {
        const compatibleRuntimes = props.compatibleRuntimes ?? [COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME];

        for (const runtime of compatibleRuntimes) {
            if (runtime && runtime.family !== lambda.RuntimeFamily.PYTHON) {
                throw new Error(`Only ${compatibleRuntimes.join(',')} runtimes are supported`);
            }
        }

        const entry = path.resolve(props.entry);
        const pipOptions = resolvePipOptions(props.pipOptions);

        super(scope, id, {
            code: lambda.Code.fromAsset(entry, {
                bundling: {
                    image: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME.bundlingImage,
                    user: 'root',
                    local: {
                        tryBundle(outputDir: string) {
                            const cliCommand = [
                                `cd ${entry}`,
                                'echo "Trying local bundling of python modules"',
                                'rm -fr .venv*',
                                `pip3 install --platform ${pipOptions.platform} --implementation ${pipOptions.implementation} --python-version ${pipOptions.pythonVersion} --only-binary=${pipOptions.onlyBinary} -r requirements.txt --target ${outputDir}/python/`
                            ].join(' && ');
                            const targetDirectory = `${outputDir}/python/`;
                            return localBundling(cliCommand, `${entry}/`, targetDirectory);
                        }
                    },
                    command: getCommandsForPythonDockerBuildWithPlatform(
                        '/asset-output/python',
                        'boto3 lambda layer',
                        pipOptions
                    )
                }
            }),
            compatibleRuntimes,
            description: props.description
        } as lambda.LayerVersionProps);
    }
}
