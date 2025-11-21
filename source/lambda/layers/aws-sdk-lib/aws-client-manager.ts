// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { APIGatewayClient } from '@aws-sdk/client-api-gateway';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { SSMClient } from '@aws-sdk/client-ssm';
import { customAwsConfig } from 'aws-node-user-agent-config';

type AWSClientType = DynamoDBClient | S3Client | CloudFormationClient | APIGatewayClient | CognitoIdentityProviderClient | SSMClient;
type ServiceName = 'dynamodb' | 's3' | 'cloudformation' | 'apigateway' | 'cognito' | 'ssm';

const CLIENT_FACTORIES: Record<ServiceName, () => AWSClientType> = {
    dynamodb: () => new DynamoDBClient(customAwsConfig()),
    s3: () => new S3Client(customAwsConfig()),
    cloudformation: () => new CloudFormationClient(customAwsConfig()),
    apigateway: () => new APIGatewayClient(customAwsConfig()),
    cognito: () => new CognitoIdentityProviderClient(customAwsConfig()),
    ssm: () => new SSMClient(customAwsConfig())
};

class AWSClientManager {
    private static clientInstances = new Map<ServiceName, AWSClientType>();

    public static getServiceClient<T extends AWSClientType>(
        serviceName: ServiceName,
        tracer?: { captureAWSv3Client: (client: any) => any }
    ): T {
        if (!AWSClientManager.clientInstances.has(serviceName)) {
            const clientFactory = CLIENT_FACTORIES[serviceName];
            if (!clientFactory) {
                throw new Error(`No client factory found for service '${serviceName}'.`);
            }
            const client = clientFactory();
            if (tracer) {
                tracer.captureAWSv3Client(client);
            }
            AWSClientManager.clientInstances.set(serviceName, client);
        }
        return AWSClientManager.clientInstances.get(serviceName) as T;
    }

    public static resetClients(): void {
        AWSClientManager.clientInstances.clear();
    }
}

export { AWSClientManager };
