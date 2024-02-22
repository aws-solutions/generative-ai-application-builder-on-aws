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
import {
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
    GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME,
    LANGCHAIN_LAMBDA_PYTHON_RUNTIME
} from '../utils/constants';

/**
 * A class that defines user-agent layer for Python runtimes
 */
export class PythonUserAgentLayer extends lambda.LayerVersion {
    constructor(scope: Construct, id: string, props: LayerProps) {
        const compatibleRuntimes = props.compatibleRuntimes ?? [
            GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME,
            LANGCHAIN_LAMBDA_PYTHON_RUNTIME,
            COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME
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
                                'python3 -m venv .venv',
                                '. .venv/bin/activate',
                                'python3 -m pip install poetry --upgrade',
                                'poetry build',
                                'poetry install --only main',
                                `poetry run pip install -t ${outputDir}/python dist/*.whl`,
                                `find ${outputDir}/python -type f -name '*.py[co]' -delete -o -type d -name __pycache__ -delete  -o -type f -name '*.coverage' -delete -o -type d -name dist -delete`,
                                `rm -fr ${outputDir}/python/boto*`,
                                'deactivate',
                                'rm -fr .venv*',
                                'rm -fr dist'
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
