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
import { FirstPartyUseCaseVPC } from '../../lib/vpc/first-party-use-case-vpc';

describe('When creating a VPC for Bedrock stack', () => {
    it('should throw an error if instantiating this construct', () => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');
        try {
            new FirstPartyUseCaseVPC(stack, 'FirstPartyUseCaseVpc', {});
        } catch (error: any) {
            expect(error.message).toContain(
                'FirstPartyUseCaseVPC does not have a stack type. Classes implementing FirstPartyUseCaseVPC should specify their stack type'
            );
        }
    });
});
