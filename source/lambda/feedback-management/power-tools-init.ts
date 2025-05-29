// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { CloudWatchNamespaces } from './utils/constants';

const serviceName = { serviceName: 'FeedbackManagement' };

export const tracer = new Tracer(serviceName);
export const logger = new Logger(serviceName);
export const metrics = new Metrics({
    namespace: CloudWatchNamespaces.FEEDBACK_MANAGEMENT,
    serviceName: serviceName.serviceName
});
