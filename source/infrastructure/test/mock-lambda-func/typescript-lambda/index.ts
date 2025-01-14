#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Handler } from 'aws-lambda';

export const handler: Handler = async (event: any, context: any) => {
    console.log('Hello world');
};
