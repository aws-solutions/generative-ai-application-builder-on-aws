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
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export enum DashboardType {
    UseCase,
    DeploymentPlatform
}

/**
 * The properties associated with Custom Dashboard
 */
export interface CustomDashboardProps {
    /**
     * The Api name for which widgets and metrics are to be created
     */
    apiName: string;

    /**
     * The user pool for which dashboard is to be created
     */
    userPoolId: string;

    /**
     * Client in the user pool for which dashboard is being created
     */
    userPoolClientId: string;

    /**
     * The UUID of the use case for which dashboard is being created. Required for UseCaseDashboard's
     */
    useCaseUUID?: string;
}

/**
 * An abstract base class to create a custom Dashboard in Amazon CloudWatch and adds widgets and defines metrics.
 * Child classes are responsible for implementing addWidgets to add all suitable metric widgets.
 */
export abstract class CustomDashboard extends Construct {
    /**
     * The custom dashboard instance created for observability
     */
    public readonly dashboard: cloudwatch.Dashboard;

    /**
     * props passed to this construct
     */
    public readonly props: CustomDashboardProps;

    constructor(scope: Construct, id: string, props: CustomDashboardProps) {
        super(scope, id);
        this.props = props;

        this.dashboard = new cloudwatch.Dashboard(this, 'CustomDashboard', {
            dashboardName: `${cdk.Aws.STACK_NAME}-${cdk.Aws.REGION}-Dashboard`,
            periodOverride: cloudwatch.PeriodOverride.AUTO,
            start: 'start',
            end: 'end'
        });

        (this.dashboard.node.defaultChild as cloudwatch.CfnDashboard).cfnOptions.deletionPolicy =
            cdk.CfnDeletionPolicy.DELETE;

        this.addWidgets();
    }

    protected abstract addWidgets(): void;
}
