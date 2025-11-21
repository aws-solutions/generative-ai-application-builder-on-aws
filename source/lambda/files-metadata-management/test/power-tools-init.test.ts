// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { tracer, logger, metrics } from '../power-tools-init';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { CloudWatchNamespace } from '../utils/constants';

describe('Power Tools Initialization', () => {
    describe('Tracer', () => {
        it('should initialize tracer instance', () => {
            expect(tracer).toBeInstanceOf(Tracer);
            expect(tracer).toBeDefined();
        });
    });

    describe('Logger', () => {
        it('should initialize logger instance', () => {
            expect(logger).toBeInstanceOf(Logger);
            expect(logger).toBeDefined();
        });
    });

    describe('Metrics', () => {
        it('should initialize metrics instance', () => {
            expect(metrics).toBeInstanceOf(Metrics);
            expect(metrics).toBeDefined();
        });
    });

    describe('Power Tools Integration', () => {
        it('should have all power tools instances available', () => {
            expect(tracer).toBeInstanceOf(Tracer);
            expect(logger).toBeInstanceOf(Logger);
            expect(metrics).toBeInstanceOf(Metrics);
        });

        it('should be able to use logger methods', () => {
            expect(typeof logger.info).toBe('function');
            expect(typeof logger.error).toBe('function');
            expect(typeof logger.debug).toBe('function');
        });

        it('should be able to use metrics methods', () => {
            expect(typeof metrics.addMetric).toBe('function');
            expect(typeof metrics.publishStoredMetrics).toBe('function');
        });

        it('should be able to use tracer methods', () => {
            expect(typeof tracer.captureMethod).toBe('function');
            expect(typeof tracer.captureAWSv3Client).toBe('function');
        });
    });
});
