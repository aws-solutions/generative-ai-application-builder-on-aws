// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export { default } from './MCPServer';
export * from './helpers';

// Export the new modular components
export { default as SchemaUpload } from './SchemaUpload';
export { default as OutboundAuth } from './OutboundAuth';
export { default as LambdaTarget } from './LambdaTarget';
export { default as OpenAPITarget } from './OpenAPITarget';
export { default as SmithyTarget } from './SmithyTarget';
export { default as TargetBasicInfo } from './TargetBasicInfo';
export { default as TargetTypeSelector } from './TargetTypeSelector';
export { default as MCPTargetConfiguration } from './MCPTargetConfiguration';