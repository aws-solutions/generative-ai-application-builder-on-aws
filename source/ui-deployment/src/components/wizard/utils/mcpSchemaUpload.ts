// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { uploadSchemaFiles } from '@/services/fetchSchemaUpload';
import { DEPLOYMENT_STATUS_NOTIFICATION, USECASE_TYPES } from '@/utils/constants';
import { MCPServerSettings } from '../interfaces/Steps/MCPServerStep';
import { BaseWizardProps } from '../interfaces/Steps/BaseWizardStep';

/**
 * Handles schema file uploads for MCP server use cases
 */
export class MCPSchemaUploadHandler {
    private static schemaNotifications: any = null;

    /**
     * Initialize the schema notifications handler
     * @param notifications
     */
    static initializeNotifications(notifications: any) {
        this.schemaNotifications = notifications;
    }

    /**
     * Uploads all schema files for MCP targets and updates the step info
     * @param stepsInfo - The wizard steps information (modified by reference)
     * @param setUseCaseDeployStatus - Function to set deployment status
     */
    static async uploadAllSchemaFiles(
        stepsInfo: Record<string, BaseWizardProps>,
        setUseCaseDeployStatus: (status: string) => void
    ): Promise<void> {
        const mcpServerInfo = stepsInfo.mcpServer as MCPServerSettings;
        if (!mcpServerInfo?.targets) return;

        // Collect all files for API request
        const allFiles: Array<{
            file: File;
            targetIndex: number;
            targetType: string;
        }> = [];

        // Collect only files that need actual uploading (no schema key or failed)
        const filesToUpload: Array<{
            file: File;
            targetIndex: number;
            targetType: string;
        }> = [];

        mcpServerInfo.targets.forEach((target, index) => {
            if (target.uploadedSchema) {
                // Add to all files for API request
                allFiles.push({
                    file: target.uploadedSchema,
                    targetIndex: index,
                    targetType: target.targetType
                });

                // Add to upload list only if needs uploading
                if (!target.uploadedSchemaKey || target.uploadFailed) {
                    filesToUpload.push({
                        file: target.uploadedSchema,
                        targetIndex: index,
                        targetType: target.targetType
                    });
                }
            }
        });

        if (allFiles.length === 0) {
            return;
        }

        try {
            setUseCaseDeployStatus(DEPLOYMENT_STATUS_NOTIFICATION.SCHEMA_UPLOAD_PENDING);

            // Send ALL files to API for presigned URLs
            const files = allFiles.map((item) => item.file);
            const targetTypes = allFiles.map((item) => item.targetType);

            const uploadResult = await uploadSchemaFiles(files, targetTypes, filesToUpload, allFiles);

            const updatedTargets = mcpServerInfo.targets.map((target: any, targetIndex: number) => {
                // Find the upload result for this specific target
                const uploadResultItem = uploadResult.results.find((result) => result.targetIndex === targetIndex);
                if (uploadResultItem) {
                    if (uploadResultItem.success) {
                        return {
                            ...target,
                            uploadedSchemaKey: uploadResultItem.schemaKey, // Use schemaKey from formFields
                            uploadedSchemaFileName: target.uploadedSchema?.name,
                            uploadFailed: false // Clear any previous failure
                        };
                    } else {
                        return {
                            ...target,
                            uploadFailed: true, // Set failure flag
                            uploadedSchemaKey: undefined, // Clear any previous schema key
                            uploadedSchemaFileName: undefined // Clear filename
                        };
                    }
                }
                return target;
            });

            // Update stepsInfo by reference
            stepsInfo.mcpServer = {
                ...mcpServerInfo,
                targets: updatedTargets,
                inError: !uploadResult.allSuccessful
            } as MCPServerSettings;

            if (!uploadResult.allSuccessful) {
                const failedFiles = uploadResult.results
                    .filter((result) => !result.success)
                    .map((result) => result.fileName)
                    .join(', ');
                const partialError = new Error(`MCP schema file upload failed for: ${failedFiles}`);
                (partialError as any).updatedStepsInfo = stepsInfo;
                throw partialError;
            }
        } catch (error) {
            setUseCaseDeployStatus(DEPLOYMENT_STATUS_NOTIFICATION.SCHEMA_UPLOAD_FAILURE);
            throw error;
        }
    }

    /**
     * Checks if the use case type requires schema uploads
     * @param useCaseType - The use case type
     * @returns True if schema uploads are required
     */
    static requiresSchemaUpload(useCaseType: string): boolean {
        return useCaseType === USECASE_TYPES.MCP_SERVER;
    }

    /**
     * Gets the count of files that need to be uploaded
     * @param stepsInfo - The wizard steps information
     * @returns Number of files to upload
     */
    static getFileCount(stepsInfo: Record<string, BaseWizardProps>): number {
        const mcpServerInfo = stepsInfo.mcpServer as MCPServerSettings;
        if (!mcpServerInfo?.targets) return 0;

        return mcpServerInfo.targets.filter((target) => target.uploadedSchema && !target.uploadedSchemaKey).length;
    }

    /**
     * Get the schema notifications
     * @returns The schema notifications object
     */
    static getNotifications() {
        return this.schemaNotifications;
    }

    /**
     * Check if the current deployment status is a schema upload failure
     * @param deployStatus - The current deployment status
     * @returns True if it's a schema upload failure
     */
    static isSchemaUploadFailure(deployStatus: string): boolean {
        return deployStatus === DEPLOYMENT_STATUS_NOTIFICATION.SCHEMA_UPLOAD_FAILURE;
    }
}
