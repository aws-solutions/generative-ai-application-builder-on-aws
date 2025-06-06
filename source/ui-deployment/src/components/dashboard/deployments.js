/* eslint-disable default-case */
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { API } from 'aws-amplify';
import { API_NAME, CFN_STACK_STATUS_INDICATOR, DEPLOYMENT_PLATFORM_API_ROUTES } from '../../utils/constants';
import { generateToken } from '../../utils/utils';

/**
 * Make a reqeust to list deployed use cases using CloudFormation
 * GET /deployments/
 *
 * @param {Object} params Use case deployment params to send to the API
 */
export async function listDeployedUseCases(currentPageIndex, searchFilter) {
    try {
        const token = await generateToken();
        const response = await API.get(API_NAME, DEPLOYMENT_PLATFORM_API_ROUTES.LIST_USE_CASES.route, {
            queryStringParameters: {
                pageNumber: currentPageIndex,
                searchFilter: searchFilter
            },
            headers: {
                Authorization: token
            }
        });

        return response;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

/**
 * Send a `DELETE` request to delete a use case deployment. The optional queryStringParameter
 * `permanentlyDelete` determines whether the use case deployment should be deleted permanently.
 * @param {string} useCaseId usecase UUID
 * @param {*} permanentlyDelete
 */
export async function deleteDeployment(useCaseId, permanentlyDelete) {
    try {
        const createRouteWithUseCaseId = (useCaseId) => {
            return DEPLOYMENT_PLATFORM_API_ROUTES.DELETE_USE_CASE.route(useCaseId);
        };

        const token = await generateToken();

        const delRequestInit = {
            headers: {
                Authorization: token
            }
        };

        if (permanentlyDelete) {
            delRequestInit.queryStringParameters = {
                permanent: 'true'
            };
        }

        const response = await API.del(API_NAME, createRouteWithUseCaseId(useCaseId), delRequestInit);

        return response;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

/**
 * Given a status, returns the corresponding status indicator type
 * @param {*} status
 * @returns
 */
export const statusIndicatorTypeSelector = (status) => {
    const successStatus = ['CREATE_COMPLETE', 'UPDATE_COMPLETE'];
    const errorStatus = ['CREATE_FAILED', 'UPDATE_FAILED', 'DELETE_FAILED', 'ROLLBACK_COMPLETE'];
    const inProgressStatus = [
        'CREATE_IN_PROGRESS',
        'UPDATE_IN_PROGRESS',
        'DELETE_IN_PROGRESS',
        'UPDATE_COMPLETE_CLEANUP_IN_PROGRESS'
    ];
    const warningStatus = [
        'UPDATE_ROLLBACK_COMPLETE',
        'UPDATE_ROLLBACK_IN_PROGRESS',
        'ROLLBACK_IN_PROGRESS',
        'ROLLBACK_FAILED',
        'ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS',
        'UPDATE_ROLLBACK_FAILED'
    ];

    const stoppedStatus = ['DELETE_COMPLETE'];

    if (successStatus.includes(status)) {
        return CFN_STACK_STATUS_INDICATOR.SUCCESS;
    }

    if (errorStatus.includes(status)) {
        return CFN_STACK_STATUS_INDICATOR.ERROR;
    }

    if (inProgressStatus.includes(status)) {
        return CFN_STACK_STATUS_INDICATOR.IN_PROGRESS;
    }

    if (warningStatus.includes(status)) {
        return CFN_STACK_STATUS_INDICATOR.WARNING;
    }

    if (stoppedStatus.includes(status)) {
        return CFN_STACK_STATUS_INDICATOR.STOPPED;
    }
    return CFN_STACK_STATUS_INDICATOR.ERROR;
};
