// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { CloudWatchNamespace } from './utils/constants';

const serviceName = { serviceName: 'UseCaseManagement' };

export const tracer = new Tracer(serviceName);
export const logger = new Logger(serviceName);
export const metrics = new Metrics({
    namespace: CloudWatchNamespace.USE_CASE_DEPLOYMENTS,
    serviceName: serviceName.serviceName
});
