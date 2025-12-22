// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CopyDeploymentUIAssets } from '../s3web/copy-deployment-ui-assets';
import { CopyPortalUIAssets } from '../s3web/copy-portal-ui-assets';
import { CopyUIAssets } from '../s3web/copy-ui-assets-nested-stack';
import { CopyUseCaseUIAssets } from '../s3web/copy-use-case-ui-assets';
import { UIDistribution } from '../s3web/ui-distribution-nested-stack';
import { UIAssetFolders } from '../utils/constants';

export interface UIInfrastructureBuilderProps {
    uiAssetFolder: string;
    deployWebApp: string;
}

/**
 * UIInfrastructureBuilder class builds UI infrastructure using AWS CDK.
 */
export class UIInfrastructureBuilder {
    /**
     * Folder containing UI assets like images, CSS files etc. that need to be copied
     * to the deployment package.
     */
    public readonly uiAssetFolder: string;

    /**
     * Custom resource used to copy UI assets to S3 before deployment.
     */
    public customResource: CopyUIAssets;

    /**
     * Name of the web app deployment. Used to reference deployment outputs.
     */
    public readonly deployWebApp: string;

    /**
     * CloudFront distribution stack that will serve the web app's content.
     */
    public cloudFrontDistributionStack: UIDistribution;

    /**
     * Stack that handles copying UI assets to S3 before deployment.
     */
    public copyUIAssetsStack: CopyUIAssets;

    /**
     * Condition that controls whether the web app deployment proceeds.
     * If this evaluates to false, deployment will be skipped.
     */
    public deployWebAppCondition: cdk.CfnCondition;

    /**
     * Constructor sets the uiAssetFolderPath property.
     *
     * @param props - UIInfrastructureBuilderProps object
     */
    constructor(props: UIInfrastructureBuilderProps) {
        this.uiAssetFolder = props.uiAssetFolder;
        this.deployWebApp = props.deployWebApp;
    }

    /**
     * Creates a UI distribution using the UIDistribution nested stack.
     *
     * @param scope - Construct scope
     * @param id - Stack id
     * @param props - NestedStackProps
     * @returns UIDistribution nested stack
     */
    public createDistribution(scope: Construct, id: string, props: cdk.NestedStackProps) {
        this.cloudFrontDistributionStack = new UIDistribution(scope, id, props);

        const deployWebAppDistributionCondition = this.getOrCreateDeployWebAppCondition(scope);

        (this.cloudFrontDistributionStack.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            deployWebAppDistributionCondition;

        return this.cloudFrontDistributionStack;
    }

    /**
     * Creates a custom resource to copy UI assets using the CopyUIAssets nested stack.
     *
     * @param scope - Construct scope
     * @param id - Stack id
     * @param props - NestedStackProps
     * @returns CopyUIAssets nested stack
     */
    public createUIAssetsCustomResource(scope: Construct, id: string, props: cdk.NestedStackProps) {
        switch (this.uiAssetFolder) {
            case UIAssetFolders.DEPLOYMENT_PLATFORM:
                this.copyUIAssetsStack = new CopyDeploymentUIAssets(scope, id, props);
                break;

            case UIAssetFolders.CHAT:
                this.copyUIAssetsStack = new CopyUseCaseUIAssets(scope, id, props);
                break;

            case UIAssetFolders.PORTAL:
                this.copyUIAssetsStack = new CopyPortalUIAssets(scope, id, props);
                break;

            default:
                throw new Error('Invalid UI asset folder');
        }

        const copyWebAssetsCondition = this.getOrCreateDeployWebAppCondition(scope);
        (this.copyUIAssetsStack.node.defaultChild as cdk.CfnResource).cfnOptions.condition = copyWebAssetsCondition;
        return this.copyUIAssetsStack;
    }

    /**
     * Gets or creates the deploy web app condition resource.
     *
     * Checks if a condition was already created, and if not, initializes a new
     * CfnCondition resource with an expression that checks if `deployWebApp` equals
     * "yes". This condition controls whether the web app deployment proceeds.
     *
     * @param scope - The construct scope for the condition resource
     * @returns The CfnCondition resource
     */
    private getOrCreateDeployWebAppCondition(scope: Construct): cdk.CfnCondition {
        if (this.deployWebAppCondition) {
            return this.deployWebAppCondition;
        }

        this.deployWebAppCondition = new cdk.CfnCondition(
            cdk.Stack.of(scope),
            'DeployWebAppUIInfrastructureCondition',
            {
                expression: cdk.Fn.conditionEquals(this.deployWebApp, 'Yes')
            }
        );
        return this.deployWebAppCondition;
    }

    /**
     * Generates a URL for the CloudFront distribution
     *
     * This method returns a URL for the CloudFront distribution configured in this stack.
     * It constructs the URL by prepending "https://" to the domain name of the distribution.
     *
     * @returns A string containing the CloudFront distribution URL
     */
    public getCloudFrontUrlWithCondition(): string {
        return cdk.Fn.conditionIf(
            this.deployWebAppCondition.logicalId,
            `https://${this.cloudFrontDistributionStack.cloudFrontDistribution.domainName}`,
            cdk.Aws.NO_VALUE
        ).toString();
    }

    /**
     * Generates a URL for the CloudFront distribution
     *
     * This method returns a URL for the CloudFront distribution configured in this stack.
     * It constructs the URL by prepending "https://" to the domain name of the distribution.
     *
     * @returns A string containing the CloudFront distribution URL
     */
    public getCloudFrontUrlWithoutCondition(): string {
        return `https://${this.cloudFrontDistributionStack.cloudFrontDistribution.domainName}`;
    }
}
