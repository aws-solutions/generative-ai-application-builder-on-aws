// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { AWSClientManager } from 'aws-sdk-lib';

/**
 * Amazon Connect invokes this Lambda from a contact flow.
 * It resolves the dialed number to (tenantId, useCaseId).
 *
 * This is the "Option A" adapter layer: Connect -> Lambda -> (agent runtime).
 * We start by routing + returning attributes; the next step is forwarding turns to the agent runtime.
 */
export const handler = async (event: any) => {
    const tableName = process.env.VOICE_ROUTING_TABLE_NAME;
    if (!tableName) {
        throw new Error('VOICE_ROUTING_TABLE_NAME is not set');
    }

    const dialedNumber =
        event?.Details?.ContactData?.SystemEndpoint?.Address ??
        event?.Details?.ContactData?.Queue?.Name ??
        event?.Details?.ContactData?.CustomerEndpoint?.Address ??
        '';

    if (!dialedNumber) {
        return {
            ok: false,
            reason: 'MissingDialedNumber'
        };
    }

    const ddbDoc = DynamoDBDocumentClient.from(AWSClientManager.getServiceClient<DynamoDBClient>('dynamodb'));
    const resp = await ddbDoc.send(
        new GetCommand({
            TableName: tableName,
            Key: { phoneNumber: dialedNumber }
        })
    );

    const item: any = resp.Item;
    if (!item) {
        return {
            ok: false,
            phoneNumber: dialedNumber,
            reason: 'UnmappedPhoneNumber'
        };
    }

    // Returned object is available to the Connect contact flow.
    // Typical usage: set contact attributes from these values.
    return {
        ok: true,
        phoneNumber: dialedNumber,
        tenantId: item.tenantId,
        useCaseId: item.useCaseId
    };
};


