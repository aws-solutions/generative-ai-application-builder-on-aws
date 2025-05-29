#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as api from 'aws-cdk-lib/aws-apigateway';
import { CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
import {
    CUSTOM_RULE_PRIORITY,
    HEADERS_NOT_ALLOWED_KEY,
    INVALID_REQUEST_HEADER_RESPONSE_CODE,
} from '../utils/constants';

import { WafwebaclToApiGateway } from '@aws-solutions-constructs/aws-wafwebacl-apigateway';
import { wrapManagedRuleSet } from '@aws-solutions-constructs/core';

export interface BaseRestEndpointProps {}

/**
 * Abstract class containing the generic REST endpoints setup
 */
export abstract class BaseRestEndpoint extends Construct {
    /**
     * local instance of the stack used to add suppressions
     */
    protected stack: cdk.Stack;

    /**
     * Lambda REST endpoint created by the construct
     */
    public restApi: api.IRestApi;

    /**
     * Counter for the priority of custom WAF rules
     */
    protected rulePriorityCounter: number;

    constructor(scope: Construct, id: string, props: BaseRestEndpointProps) {
        super(scope, id);
        this.stack = cdk.Stack.of(scope);
        this.rulePriorityCounter = CUSTOM_RULE_PRIORITY;
    }

    protected configureWaf(restApi: api.IRestApi, WafWebAclToApiGatewayResourceName: string): WafwebaclToApiGateway {
        return new WafwebaclToApiGateway(this, WafWebAclToApiGatewayResourceName, {
            existingApiGatewayInterface: restApi,
            webaclProps: {
                defaultAction: { allow: {} },
                scope: 'REGIONAL',
                rules: [
                    wrapManagedRuleSet('AWSManagedRulesBotControlRuleSet', 'AWS', 0),
                    wrapManagedRuleSet('AWSManagedRulesKnownBadInputsRuleSet', 'AWS', 1),
                    this.defineAWSManagedRulesCommonRuleSetWithBodyOverride(2),
                    wrapManagedRuleSet('AWSManagedRulesAnonymousIpList', 'AWS', 3),
                    wrapManagedRuleSet('AWSManagedRulesAmazonIpReputationList', 'AWS', 4),
                    wrapManagedRuleSet('AWSManagedRulesAdminProtectionRuleSet', 'AWS', 5),
                    wrapManagedRuleSet('AWSManagedRulesSQLiRuleSet', 'AWS', 6),
                    this.defineBlockRequestHeadersRule(),
                    this.defineBlockOversizedBodyNotInDeployRule()
                ],
                customResponseBodies: {
                    [HEADERS_NOT_ALLOWED_KEY]: this.createHeadersNotAllowedResponse()
                }
            }
        });
    }

    /**
     * Configure all 4XX and 5XX responses to have CORS headers
     * Note that the error responses are configured per Amazon's security recommendations
     * @param restApi
     */
    protected configureGatewayResponses(restApi: api.IRestApi) {
        const templates = {
            'application/json':
                '{"error":{"message":"$context.error.messageString","errors":"$context.error.validationErrorString"}}'
        };
        this.configureResponseHeaders(restApi, 'BadRequestDefaultResponse', '400', api.ResponseType.DEFAULT_4XX);
        this.configureResponseHeaders(
            restApi,
            'InternalServerErrorDefaultResponse',
            '400',
            api.ResponseType.DEFAULT_5XX
        );
        this.configureResponseHeaders(
            restApi,
            'BadRequestBodyResponse',
            '400',
            api.ResponseType.BAD_REQUEST_BODY,
            templates
        );
        this.configureResponseHeaders(
            restApi,
            'BadRequestParametersResponse',
            '400',
            api.ResponseType.BAD_REQUEST_PARAMETERS,
            templates
        );
    }

    /**
     * Configure all 4XX and 5XX responses to have CORS headers
     * @param restApi
     */
    protected configureResponseHeaders(
        restApi: api.IRestApi,
        resourceName: string,
        statusCode: string,
        httpResponseCodeType: api.ResponseType,
        templates?: {
            [key: string]: string;
        }
    ) {
        new api.GatewayResponse(this, resourceName, {
            restApi: restApi,
            type: httpResponseCodeType,
            statusCode: statusCode,
            responseHeaders: {
                'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
                'gatewayresponse.header.Access-Control-Allow-Headers': "'*'"
            },
            templates: templates ?? undefined
        });
    }

    protected createHeadersNotAllowedResponse(): CfnWebACL.CustomResponseBodyProperty {
        return {
            content: 'One of your injected headers is not allowed',
            contentType: 'TEXT_PLAIN'
        };
    }

    /**
     * Define WAF rule for blocking any request that contains the `X-Amzn-Requestid` header
     * @returns WAF rule
     */
    protected defineBlockRequestHeadersRule(): CfnWebACL.RuleProperty {
        return {
            priority: this.getCustomRulePriority(),
            name: 'Custom-BlockRequestHeaders',
            action: {
                block: {
                    customResponse: {
                        responseCode: INVALID_REQUEST_HEADER_RESPONSE_CODE,
                        customResponseBodyKey: HEADERS_NOT_ALLOWED_KEY
                    }
                }
            },
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: 'Custom-BlockRequestHeaders',
                sampledRequestsEnabled: true
            },
            statement: {
                sizeConstraintStatement: {
                    fieldToMatch: {
                        singleHeader: {
                            'Name': 'x-amzn-requestid'
                        }
                    },
                    comparisonOperator: 'GE',
                    size: 0,
                    textTransformations: [
                        {
                            type: 'NONE',
                            priority: 0
                        }
                    ]
                }
            }
        };
    }

    /**
     * Define WAF rule which enforces the SizeRestrictions_Body rule from the core rule set for URIs not in the /deployments path
     * @returns WAF rule
     */
    protected defineBlockOversizedBodyNotInDeployRule(): CfnWebACL.RuleProperty {
        return {
            priority: this.getCustomRulePriority(),
            name: 'Custom-BlockOversizedBodyNotInDeploy',
            action: {
                block: {}
            },
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: 'Custom-BlockOversizedBodyNotInDeploy',
                sampledRequestsEnabled: true
            },
            statement: {
                andStatement: {
                    statements: [
                        {
                            labelMatchStatement: {
                                scope: 'LABEL',
                                key: 'awswaf:managed:aws:core-rule-set:SizeRestrictions_Body'
                            }
                        },
                        {
                            notStatement: {
                                statement: {
                                    byteMatchStatement: {
                                        searchString: '/deployments',
                                        fieldToMatch: {
                                            uriPath: {}
                                        },
                                        textTransformations: [
                                            {
                                                priority: 0,
                                                type: 'NONE'
                                            }
                                        ],
                                        positionalConstraint: 'ENDS_WITH'
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        };
    }

    /**
     * Defines a WAF rule which enforces the AWSManagedRulesCommonRuleSet, with an override to only count the SizeRestrictions_BODY.
     * @param priority The priority of the rule
     * @returns The WAF rule
     */
    protected defineAWSManagedRulesCommonRuleSetWithBodyOverride(priority: number): CfnWebACL.RuleProperty {
        return {
            name: 'AWS-AWSManagedRulesCommonRuleSet',
            priority: priority,
            statement: {
                managedRuleGroupStatement: {
                    vendorName: 'AWS',
                    name: 'AWSManagedRulesCommonRuleSet',
                    ruleActionOverrides: [
                        {
                            name: 'SizeRestrictions_BODY',
                            actionToUse: {
                                count: {}
                            }
                        }
                    ]
                }
            },
            overrideAction: {
                none: {}
            },
            visibilityConfig: {
                sampledRequestsEnabled: true,
                cloudWatchMetricsEnabled: true,
                metricName: 'AWS-AWSManagedRulesCommonRuleSet'
            }
        };
    }

    /**
     * Gets a unique priority for a custom rule, incrementing an internal counter
     * @returns A unique priority for each custom rule
     */
    protected getCustomRulePriority(): number {
        return this.rulePriorityCounter++;
    }
}
