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
import { CognitoSetup, CognitoSetupProps } from './cognito-setup';

export class DeploymentPlatformCognitoSetup extends CognitoSetup {
    constructor(scope: Construct, id: string, props: CognitoSetupProps) {
        super(scope, id);

        this.userPool = this.createUserPool(props.userPoolProps!);
        this.createUserAndUserGroup(props.userPoolProps!);
        this.createUserPoolDomain(props.userPoolProps!);
        this.cognitoGroupPolicyTable = this.createPolicyTable();
        this.getOrCreateDeployWebAppCondition(this, props.userPoolClientProps?.deployWebApp!);
        this.createUserPoolClient({
            callbackUrl: cdk.Fn.conditionIf(
                this.deployWebAppCondition.logicalId,
                props.userPoolClientProps!.callbackUrl,
                cdk.Aws.NO_VALUE
            ).toString(),
            logoutUrl: cdk.Fn.conditionIf(
                this.deployWebAppCondition.logicalId,
                props.userPoolClientProps!.callbackUrl,
                cdk.Aws.NO_VALUE
            ).toString(),
            deployWebApp: props.userPoolClientProps?.deployWebApp
        });
    }
}
