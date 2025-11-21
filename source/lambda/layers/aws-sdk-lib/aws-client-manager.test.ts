// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

jest.mock('aws-node-user-agent-config', () => ({
    customAwsConfig: jest.fn(() => ({ region: 'us-east-1' }))
}));

import { AWSClientManager } from './aws-client-manager';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';

describe('AWSClientManager', () => {
    beforeEach(() => {
        AWSClientManager.resetClients();
        process.env.AWS_SDK_USER_AGENT = '{"customUserAgent": "AWSSOLUTION/SO0276/v2.0.0"}';
    });

    afterEach(() => {
        delete process.env.AWS_SDK_USER_AGENT;
    });

    it('should return singleton DynamoDB client', () => {
        const client1 = AWSClientManager.getServiceClient<DynamoDBClient>('dynamodb');
        const client2 = AWSClientManager.getServiceClient<DynamoDBClient>('dynamodb');
        
        expect(client1).toBe(client2);
        expect(client1).toBeInstanceOf(DynamoDBClient);
    });

    it('should return singleton S3 client', () => {
        const client1 = AWSClientManager.getServiceClient<S3Client>('s3');
        const client2 = AWSClientManager.getServiceClient<S3Client>('s3');
        
        expect(client1).toBe(client2);
        expect(client1).toBeInstanceOf(S3Client);
    });

    it('should return different clients for different services', () => {
        const ddbClient = AWSClientManager.getServiceClient<DynamoDBClient>('dynamodb');
        const s3Client = AWSClientManager.getServiceClient<S3Client>('s3');
        
        expect(ddbClient).not.toBe(s3Client);
    });

    it('should capture client with tracer when provided', () => {
        const mockTracer = { captureAWSv3Client: jest.fn((client) => client) };
        
        AWSClientManager.getServiceClient<DynamoDBClient>('dynamodb', mockTracer);
        
        expect(mockTracer.captureAWSv3Client).toHaveBeenCalledTimes(1);
    });

    it('should not call tracer on subsequent calls', () => {
        const mockTracer = { captureAWSv3Client: jest.fn((client) => client) };
        
        AWSClientManager.getServiceClient<DynamoDBClient>('dynamodb', mockTracer);
        AWSClientManager.getServiceClient<DynamoDBClient>('dynamodb', mockTracer);
        
        expect(mockTracer.captureAWSv3Client).toHaveBeenCalledTimes(1);
    });

    it('should reset clients', () => {
        const client1 = AWSClientManager.getServiceClient<DynamoDBClient>('dynamodb');
        
        AWSClientManager.resetClients();
        
        const client2 = AWSClientManager.getServiceClient<DynamoDBClient>('dynamodb');
        expect(client1).not.toBe(client2);
    });

    it('should throw error for unsupported service', () => {
        expect(() => {
            AWSClientManager.getServiceClient('unsupported' as any);
        }).toThrow("No client factory found for service 'unsupported'");
    });
});
