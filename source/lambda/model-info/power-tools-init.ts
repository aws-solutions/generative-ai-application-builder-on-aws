// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';

const serviceName = { serviceName: 'ModelInfo' };

export const tracer = new Tracer(serviceName);
export const logger = new Logger(serviceName);
