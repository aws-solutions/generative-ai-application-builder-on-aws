#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { execSync } from 'child_process';
import { IConstruct } from 'constructs';
import * as fs from 'fs';
import * as log from 'npmlog';
import { LocalBuildTemplate } from '../base-build-package-template';

/**
 * Method to locally bundle packages based for specific runtimes
 *
 * @param cliCommand - the command to execute to pull modules for packaging
 * @param entry - the source directory from which to copy the modules/ packages
 * @param targetDirectory - the destination directory for layers to which they should be copied based on the runtime
 *
 * @returns - boolean value indicating if it was successful in packaging modules locally
 */
export function localBundling(cliCommand: string[], entry: string, targetDirectory: string): boolean {
    try {
        log.prefixStyle.bold = true;
        log.prefixStyle.fg = 'blue';
        log.enableColor();

        if (!fs.existsSync(targetDirectory)) {
            fs.mkdirSync(targetDirectory, {
                recursive: true
            });
        }

        log.log('ERROR', 'Executing command:', cliCommand);
        execSync(cliCommand.join(' && '), { stdio: 'inherit' }); // NOSONAR - this is build/ packaging stage. Safe to execute shell
    } catch (error) {
        console.error(`Error with local bundling, entry is ${entry}, cliCommand is ${cliCommand}`, error);
        return false;
    }
    return true;
}

/**
 * Function to provide local bundling for asset bundlers
 *
 * @param moduleName
 * @returns
 */
export function getLocalBundler(
    template: LocalBuildTemplate,
    construct: IConstruct,
    moduleName: string
): cdk.ILocalBundling {
    return {
        tryBundle(outputDir: string, options: cdk.BundlingOptions): boolean {
            return localBundling(template.bundle(construct, moduleName, outputDir), moduleName, outputDir);
        }
    } as cdk.ILocalBundling;
}
