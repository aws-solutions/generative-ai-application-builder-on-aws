// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import {
    parse
} from '@aws-sdk/util-arn-parser';


/**
 * Matches a component value against a pattern with wildcard support
 * @param value - The value to match
 * @param pattern - The pattern to match against (supports * and ? wildcards)
 * @returns True if the value matches the pattern
 */
export function matchComponent(value: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern === value) return true;
  
  // Convert to regex for wildcard matching
  const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
  try {
    return new RegExp(`^${regexPattern}$`).test(value);
  } catch (error) {
    console.error('Error creating regex:', error);
    throw new Error(`Failed to match component for pattern: ${pattern}`);
  }
}

/**
 * Validates and matches an ARN against a pattern ARN
 * @param arn - The ARN to validate
 * @param pattern - The pattern ARN to match against
 * @returns True if the ARN matches the pattern
 */
export function matchArnWithValidation(arn: string, pattern: string): boolean {
  try {
    const parsedArn = parse(arn);
    const parsedPattern = parse(pattern);

    if (!parsedArn || !parsedPattern) return false;
  
    // Match each component
    return (
      matchComponent(parsedArn.partition, parsedPattern.partition) &&
      matchComponent(parsedArn.service, parsedPattern.service) &&
      matchComponent(parsedArn.region, parsedPattern.region) &&
      matchComponent(parsedArn.accountId, parsedPattern.accountId) &&
      matchComponent(parsedArn.resource, parsedPattern.resource)
    );
  } catch (error) {
    console.error('Error matching ARN components:', error)
    // Default to false and continue authorizing
    return false;
  }
}