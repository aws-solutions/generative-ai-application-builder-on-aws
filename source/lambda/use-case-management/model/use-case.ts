// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CfnParameterKeys, RetainedCfnParameterKeys } from '../utils/constants';
import {
    MCPUseCaseConfiguration,
    UseCaseConfiguration,
    AgentUseCaseConfiguration,
    AgentBuilderUseCaseConfiguration,
    WorkflowUseCaseConfiguration
} from './types';

/**
 * Data Model to store capture use case specific information
 */
export class UseCase {
    /**
     * The unique identifier of the use case.
     */
    public readonly useCaseId: string;

    /**
     * Use case type
     */
    public readonly useCaseType: string;

    /**
     * Name of the use case to be deployed
     */
    public readonly name: string;

    /**
     * Description of the use case to be deployed
     */
    public readonly description?: string;

    /**
     * ID of the user requesting the creation of the use case
     */
    public readonly userId: string;

    /**
     * CloudFormation parameters to be passed to the use case (stored as a Map)
     */
    public cfnParameters?: Map<string, string>;

    /**
     * Name of the provider for the use case
     */
    public readonly providerName: string | undefined;

    /**
     * Additional configuration for the use case, stored as a JSON object in SSM
     */
    public configuration:
        | UseCaseConfiguration
        | AgentUseCaseConfiguration
        | MCPUseCaseConfiguration
        | AgentBuilderUseCaseConfiguration
        | WorkflowUseCaseConfiguration;

    /**
     * The template which should be used to deploy the use case
     */
    public templateName: string;

    /**
     * 8-character sliced UUID (derived from useCaseId) to append to CFN resources
     */
    public shortUUID: string;

    /**
     * 3rd party API key to be used for the use case
     */
    public apiKey?: string;

    /**
     * Platform SaaS: owning tenant id (for customer isolation). Present when this deployment is assigned to a customer.
     */
    public tenantId?: string;

    /**
     * The ID of the stack that was created. This is used for update and delete stacks.
     */
    _stackId: string;

    // prettier-ignore
    constructor( //NOSONAR - typescript:S107 - data model class hence needs primitive types as parameters
        useCaseId: string,
        name: string,
        description: string | undefined,
        cfnParameters: Map<string, string> | undefined,
        configuration: UseCaseConfiguration | AgentUseCaseConfiguration | MCPUseCaseConfiguration | AgentBuilderUseCaseConfiguration | WorkflowUseCaseConfiguration,
        userId: string,
        providerName: string | undefined,
        useCaseType: string,
    ) {
        this.useCaseId = useCaseId;
        this.name = name;
        this.description = description;
        this.cfnParameters = cfnParameters;
        this.configuration = configuration;
        this.userId = userId;
        this.providerName = providerName
        this.shortUUID = this.useCaseId.substring(0, 8);
        this.useCaseType = useCaseType;
        this.templateName = this.generateTemplateName(providerName, useCaseType);
    }

    /**
     * Generates the template name for the use case. Can be overridden by subclasses
     * to provide custom template naming logic.
     *
     * @param providerName The provider name (e.g., 'Bedrock', 'SageMaker')
     * @param useCaseType The use case type (e.g., 'Chat', 'Agent')
     * @returns The template name to use for CloudFormation deployment
     */
    protected generateTemplateName(providerName: string | undefined, useCaseType: string): string {
        return providerName === undefined ? useCaseType : `${providerName}${useCaseType}`;
    }

    private createCfnParametersMapIfNotExists(): void {
        if (this.cfnParameters === undefined) {
            this.cfnParameters = new Map<string, string>();
        }
    }

    get stackId(): string {
        return this._stackId;
    }

    set stackId(stackId: string) {
        this._stackId = stackId;
    }

    public getUseCaseConfigRecordKey() {
        return this.cfnParameters?.get(CfnParameterKeys.UseCaseConfigRecordKey);
    }

    public setUseCaseConfigRecordKey(useCaseConfigRecordKey: string) {
        this.createCfnParametersMapIfNotExists();
        this.cfnParameters!.set(CfnParameterKeys.UseCaseConfigRecordKey, useCaseConfigRecordKey);
    }

    public static generateUseCaseConfigRecordKey(shortUUID: string, recordKeySuffixUUID: string): string {
        return `${shortUUID}-${recordKeySuffixUUID}`;
    }

    public static generateShortUUID(id: string): string {
        return id.substring(0, 8);
    }

    /**
     * Returns the list of CloudFormation parameters that should be retained during stack updates.
     * Can be overridden by subclasses to provide use case-specific retention behavior.
     *
     * @returns Array of parameter keys that should use previous values during updates
     */
    public getRetainedParameterKeys(): string[] {
        return RetainedCfnParameterKeys;
    }

    /**
     * Performs a deep copy of this object, preserving methods and property values
     *
     * @returns a deep copy of the object
     */
    public clone(): UseCase {
        let newUseCase = new UseCase(
            this.useCaseId,
            this.name,
            this.description,
            new Map<string, string>(this.cfnParameters),
            { ...this.configuration },
            this.userId,
            this.providerName,
            this.useCaseType
        );

        return newUseCase;
    }

    /**
     * If the provided value is defined, sets the correct Cloudformation Parameter to that value as a string.
     *
     * @param cfnParameters The parameter map to set the value in
     * @param paramName Name of the Cloudformation Parameter to set
     * @param value value to set
     */
    protected static setParameterIfExists(
        cfnParameters: Map<string, string>,
        paramName: string,
        value: any | undefined
    ): void {
        if (value !== undefined) {
            cfnParameters.set(paramName, value.toString());
        }
    }

    /**
     * If the provided value is defined, sets the correct Cloudformation Parameter to 'Yes' or 'No' accordingly.
     *
     * @param cfnParameters The parameter map to set the value in
     * @param paramName Name of the Cloudformation Parameter to set
     * @param value boolean value to set
     */
    protected static setBooleanParameterIfExists(
        cfnParameters: Map<string, string>,
        paramName: string,
        value: boolean | undefined
    ): void {
        if (value !== undefined) {
            if (value) {
                cfnParameters.set(paramName, 'Yes');
            } else {
                cfnParameters.set(paramName, 'No');
            }
        }
    }

    /**
     * If the provided value is defined, sets the correct Cloudformation Parameter to a comma separated list of the values.
     *
     * @param cfnParameters The parameter map to set the value in
     * @param paramName Name of the Cloudformation Parameter to set
     * @param values Array of values to set
     */
    protected static setListParameterIfExists(
        cfnParameters: Map<string, string>,
        paramName: string,
        values: Array<any> | undefined
    ): void {
        if (values !== undefined) {
            let valueString = '';
            for (const item of values) {
                valueString += item.toString() + ',';
            }
            // remove trailing comma
            if (valueString.charAt(valueString.length - 1) == ',') {
                valueString = valueString.slice(0, -1);
            }
            cfnParameters.set(paramName, valueString);
        }
    }
}
