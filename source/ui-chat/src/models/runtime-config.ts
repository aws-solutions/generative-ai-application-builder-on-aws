// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { TextUseCaseConfig, AgentUseCaseConfig } from './use-case-config';

export interface RuntimeConfig {
    IsInternalUser: string;
    ModelProviderName: string;
    UserPoolId: string;
    SocketRoutes: string[];
    UserPoolClientId: string;
    CognitoRedirectUrl: string;
    ApiEndpoint: string;
    SocketURL: string;
    AwsRegion: string;
    CognitoDomain: string;
    UseCaseConfigKey: string;
    UseCaseId: string;
    UseCaseConfig?: TextUseCaseConfig | AgentUseCaseConfig;
    RestApiEndpoint: string;
}
