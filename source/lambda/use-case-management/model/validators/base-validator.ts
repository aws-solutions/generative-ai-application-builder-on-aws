// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { StorageManagement } from '../../ddb/storage-management';
import { UseCaseConfigManagement } from '../../ddb/use-case-config-management';
import { UseCase } from '../use-case';

/**
 * Abstract base class for use case validators.
 * This class provides a common interface for validating different types of use cases.
 * Uses generics to ensure type safety for specific configuration types.
 */
export abstract class UseCaseValidator<T = any> {
    protected storageMgmt: StorageManagement;
    protected useCaseConfigMgmt: UseCaseConfigManagement;

    constructor(storageMgmt: StorageManagement, useCaseConfigMgmt: UseCaseConfigManagement) {
        this.storageMgmt = storageMgmt;
        this.useCaseConfigMgmt = useCaseConfigMgmt;
    }

    /**
     * Validates a new use case.
     *
     * @param useCase - The use case to be validated
     * @returns A promise that resolves to the validated use case
     */
    public abstract validateNewUseCase(useCase: UseCase): Promise<UseCase>;

    /**
     * Validates an updated use case.
     *
     * @param useCase - The use case to be validated
     * @param oldDynamoDbRecordKey - The key of the old DynamoDB record
     * @returns A promise that resolves to the validated use case
     */
    public abstract validateUpdateUseCase(useCase: UseCase, oldDynamoDbRecordKey: string): Promise<UseCase>;

    /**
     * Type-safe getter for configuration with proper casting
     * @param useCase - The use case to get configuration from
     * @returns The configuration cast to the appropriate type
     */
    protected getTypedConfiguration(useCase: UseCase): T {
        return useCase.configuration as T;
    }
}
