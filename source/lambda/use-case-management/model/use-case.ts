/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 **********************************************************************************************************************/

import { CfnParameterKeys } from '../utils/constants';
import { UseCaseConfiguration } from './types';

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
    public readonly providerName: string;

    /**
     * Additional configuration for the use case, stored as a JSON object in SSM
     */
    public configuration: UseCaseConfiguration;

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
     * The ID of the stack that was created. This is used for update and delete stacks.
     */
    _stackId: string;

    // prettier-ignore
    constructor( //NOSONAR - typescript:S107 - data model class hence needs primitive types as parameters
        useCaseId: string,
        name: string,
        description: string | undefined,
        cfnParameters: Map<string, string> | undefined,
        configuration: UseCaseConfiguration,
        userId: string,
        providerName: string,
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
        this.templateName = `${providerName}${useCaseType}`;
        this.useCaseType = useCaseType;
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
            this.templateName
                .split(/(?=[A-Z])/)
                .slice(0, -1)
                .join(''), // provider name
            this.templateName.split(/(?=[A-Z])/).pop()! // use case type, the last capitalized portion
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
