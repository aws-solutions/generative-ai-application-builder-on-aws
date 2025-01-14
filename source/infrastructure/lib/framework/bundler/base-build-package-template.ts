#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { IConstruct } from 'constructs';
import {
    BUILD_FLAG,
    CLEAN_UP_FLAG,
    POST_BUILD_FLAG,
    PRE_BUILD_FLAG,
    SKIP_BUILD_VAR,
    SKIP_CLEAN_UP_VAR,
    SKIP_POST_BUILD_VAR,
    SKIP_PRE_BUILD_VAR,
    SKIP_UNIT_TEST_VAR,
    UNIT_TEST_FLAG
} from './constants';

/**
 * A template implementation of build stages as part of asset bundling.
 */
export abstract class BaseBuildTemplate {
    private isUnitTestContextFlagSet(construct: IConstruct): boolean {
        return (
            construct.node.tryGetContext(UNIT_TEST_FLAG) === undefined ||
            (construct.node.tryGetContext(UNIT_TEST_FLAG) as boolean) === true
        );
    }

    private isSkipUnitTestEnvSet(): boolean {
        return 'true' !== (process.env[SKIP_UNIT_TEST_VAR] ?? 'false').toLocaleLowerCase();
    }

    private isPreBuildFlagSet(construct: IConstruct): boolean {
        return (
            construct.node.tryGetContext(PRE_BUILD_FLAG) === undefined ||
            (construct.node.tryGetContext(PRE_BUILD_FLAG) as boolean) === true
        );
    }

    private isSkipPreBuildEnvSet(): boolean {
        return 'true' !== (process.env[SKIP_PRE_BUILD_VAR] ?? 'false').toLocaleLowerCase();
    }

    private isBuildFlagSet(construct: IConstruct): boolean {
        return (
            construct.node.tryGetContext(BUILD_FLAG) === undefined ||
            (construct.node.tryGetContext(BUILD_FLAG) as boolean) === true
        );
    }

    private isSkipBuildEnvSet(): boolean {
        return 'true' !== (process.env[SKIP_BUILD_VAR] ?? 'false').toLowerCase();
    }

    private isPostBuildFlagSet(construct: IConstruct): boolean {
        return (
            construct.node.tryGetContext(POST_BUILD_FLAG) === undefined ||
            (construct.node.tryGetContext(POST_BUILD_FLAG) as boolean) === true
        );
    }

    private isSkipPostBuildEnvSet(): boolean {
        return 'true' !== (process.env[SKIP_POST_BUILD_VAR] ?? 'false').toLocaleLowerCase();
    }

    private isCleanFlagSet(construct: IConstruct): boolean {
        return (
            construct.node.tryGetContext(CLEAN_UP_FLAG) === undefined ||
            construct.node.tryGetContext(CLEAN_UP_FLAG) === true
        );
    }

    private isSkipPostCleanEnvSet(): boolean {
        return 'true' !== (process.env[SKIP_CLEAN_UP_VAR] ?? 'false').toLowerCase();
    }

    /**
     * Template method to define the stages for asset bundling
     */
    public bundle(construct: IConstruct, moduleName: string, outputDir: string): string[] {
        let commandList: string[] = [];

        // the environment variables in each of the below if conditions can be used to suppress specific stage. They are
        // stage overrides that can be set in the shell environment they are running on.
        if (this.isUnitTestContextFlagSet(construct) && this.isSkipUnitTestEnvSet()) {
            commandList = commandList.concat(this.unitTest(moduleName, outputDir, construct));
        }

        if (this.isPreBuildFlagSet(construct) && this.isSkipPreBuildEnvSet()) {
            commandList = commandList.concat(this.preBuild(moduleName, outputDir, construct));
        }

        if (this.isBuildFlagSet(construct) && this.isSkipBuildEnvSet()) {
            commandList = commandList.concat(this.build(moduleName, outputDir, construct));
        }

        if (this.isPostBuildFlagSet(construct) && this.isSkipPostBuildEnvSet()) {
            commandList = commandList.concat(this.postBuild(moduleName, outputDir, construct));
        }

        if (this.isCleanFlagSet(construct) && this.isSkipPostCleanEnvSet()) {
            commandList = commandList.concat(this.cleanup(moduleName, outputDir, construct));
        }

        return commandList;
    }

    /**
     * Abstract method that implementation classes can override to provide pre-build setup/ env creation, etc.
     */
    protected abstract preBuild(moduleName: string, outputDir: string, construct?: IConstruct): string[];

    /**
     * Abstract method that implementation classes can override to provide build and packaging steps
     */
    protected abstract build(moduleName: string, outputDir: string, construct?: IConstruct): string[];

    /**
     * Abstract method that implementation classes can override to provide unit test execution details
     */
    protected abstract unitTest(moduleName: string, outputDir: string, construct?: IConstruct): string[];

    /**
     * Abstract method that implementation classes can override to provide post-build cleaning or deleting environments
     * created for the purpose of the build
     */
    protected abstract postBuild(moduleName: string, outputDir: string, construct?: IConstruct): string[];

    /**
     * Abstract method that implementation classes can override to provide cleanup steps after the build is complete
     */
    protected abstract cleanup(moduleName: string, outputDir: string, construct?: IConstruct): string[];
}

/**
 * A docker specific build template abstract class
 */
export abstract class DockerBuildTemplate extends BaseBuildTemplate {
    /**
     * bundler implementation for docker builds
     *
     * @param moduleName
     * @param outputDir
     * @returns
     */
    public bundle(construct: IConstruct, moduleName: string, outputDir: string): string[] {
        return ['bash', '-c', super.bundle(construct, moduleName, outputDir).join(' && ')];
    }
}

/**
 * A local bundling build template abstract class
 */
export abstract class LocalBuildTemplate extends BaseBuildTemplate {}
