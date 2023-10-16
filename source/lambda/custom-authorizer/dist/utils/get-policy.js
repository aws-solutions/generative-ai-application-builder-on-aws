"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchQueryDynamoDB = exports.getPolicyDocument = exports.denyAllPolicy = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const aws_node_user_agent_config_1 = require("aws-node-user-agent-config");
/**
 * Function that generates a IAM policy that denies all requests.
 *
 * @returns Deny policy JSON
 */
const denyAllPolicy = () => {
    return {
        principalId: '*',
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: '*',
                    Effect: 'Deny',
                    Resource: '*'
                }
            ]
        }
    };
};
exports.denyAllPolicy = denyAllPolicy;
/**
 * Creates a policy composed of the policies returned for all groups the idToken belongs to.
 * This policy will allow the user access to any APIs that the groups they belong to have access to.
 *
 * @param idToken Decoded JWT Authorization token received in request header.
 * @returns
 */
const getPolicyDocument = async (idToken) => {
    const groups = idToken['cognito:groups'];
    const tableName = process.env.COGNITO_POLICY_TABLE_NAME;
    const results = await (0, exports.batchQueryDynamoDB)(tableName, groups); // NOSONAR typescript:S4325 - removing the assertion causes compilation failure
    console.debug(`Received results from DynamoDB: ${JSON.stringify(results)}`);
    if (results.Responses && results.Responses[tableName] && results.Responses[tableName].length > 0) {
        let statements = [];
        for (const resultPolicy of results.Responses[tableName]) {
            try {
                statements.push(...resultPolicy.policy.Statement);
            }
            catch (error) {
                console.warn(`Error parsing policy ${resultPolicy}. Got error: ${error}. Skipping.`);
            }
        }
        return {
            principalId: '*',
            policyDocument: {
                'Version': results.Responses[tableName][0].policy.Version,
                'Statement': statements
            },
            context: {
                UserId: idToken.sub
            }
        };
    }
    return (0, exports.denyAllPolicy)();
};
exports.getPolicyDocument = getPolicyDocument;
/**
 * Will retrieve the policies for all the groups the provided token belongs to
 *
 * @param tableName
 * @param groups
 * @returns
 */
const batchQueryDynamoDB = async (tableName, groups) => {
    const ddbClient = new client_dynamodb_1.DynamoDBClient((0, aws_node_user_agent_config_1.customAwsConfig)());
    const ddbDocClient = lib_dynamodb_1.DynamoDBDocumentClient.from(ddbClient);
    const result = await ddbDocClient.send(new lib_dynamodb_1.BatchGetCommand({
        RequestItems: {
            [tableName]: {
                Keys: groups.map((groupName) => {
                    return { group: groupName };
                })
            }
        }
    }));
    return result;
};
exports.batchQueryDynamoDB = batchQueryDynamoDB;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXBvbGljeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3V0aWxzL2dldC1wb2xpY3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozt3SEFXd0g7OztBQUV4SCw4REFBMEQ7QUFDMUQsd0RBQXVHO0FBR3ZHLDJFQUE2RDtBQUU3RDs7OztHQUlHO0FBQ0ksTUFBTSxhQUFhLEdBQUcsR0FBRyxFQUFFO0lBQzlCLE9BQU87UUFDSCxXQUFXLEVBQUUsR0FBRztRQUNoQixjQUFjLEVBQUU7WUFDWixPQUFPLEVBQUUsWUFBWTtZQUNyQixTQUFTLEVBQUU7Z0JBQ1A7b0JBQ0ksTUFBTSxFQUFFLEdBQUc7b0JBQ1gsTUFBTSxFQUFFLE1BQU07b0JBQ2QsUUFBUSxFQUFFLEdBQUc7aUJBQ2hCO2FBQ0o7U0FDSjtLQUNKLENBQUM7QUFDTixDQUFDLENBQUM7QUFkVyxRQUFBLGFBQWEsaUJBY3hCO0FBRUY7Ozs7OztHQU1HO0FBQ0ksTUFBTSxpQkFBaUIsR0FBRyxLQUFLLEVBQUUsT0FBa0MsRUFBeUIsRUFBRTtJQUNqRyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUN6QyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUEwQixDQUFDO0lBQ3pELE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBQSwwQkFBa0IsRUFBQyxTQUFTLEVBQUUsTUFBTyxDQUFDLENBQUMsQ0FBQywrRUFBK0U7SUFDN0ksT0FBTyxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFNUUsSUFBSSxPQUFPLENBQUMsU0FBUyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQzlGLElBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQztRQUNwQixLQUFLLE1BQU0sWUFBWSxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDckQsSUFBSTtnQkFDQSxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQzthQUNyRDtZQUFDLE9BQU8sS0FBSyxFQUFFO2dCQUNaLE9BQU8sQ0FBQyxJQUFJLENBQUMsd0JBQXdCLFlBQVksZ0JBQWdCLEtBQUssYUFBYSxDQUFDLENBQUM7YUFDeEY7U0FDSjtRQUNELE9BQU87WUFDSCxXQUFXLEVBQUUsR0FBRztZQUNoQixjQUFjLEVBQUU7Z0JBQ1osU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU87Z0JBQ3pELFdBQVcsRUFBRSxVQUFVO2FBQzFCO1lBQ0QsT0FBTyxFQUFFO2dCQUNMLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRzthQUN0QjtTQUNKLENBQUM7S0FDTDtJQUNELE9BQU8sSUFBQSxxQkFBYSxHQUFFLENBQUM7QUFDM0IsQ0FBQyxDQUFDO0FBM0JXLFFBQUEsaUJBQWlCLHFCQTJCNUI7QUFFRjs7Ozs7O0dBTUc7QUFDSSxNQUFNLGtCQUFrQixHQUFHLEtBQUssRUFBRSxTQUFpQixFQUFFLE1BQWdCLEVBQWtDLEVBQUU7SUFDNUcsTUFBTSxTQUFTLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLElBQUEsNENBQWUsR0FBRSxDQUFDLENBQUM7SUFDeEQsTUFBTSxZQUFZLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBRTVELE1BQU0sTUFBTSxHQUFHLE1BQU0sWUFBWSxDQUFDLElBQUksQ0FDbEMsSUFBSSw4QkFBZSxDQUFDO1FBQ2hCLFlBQVksRUFBRTtZQUNWLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQ1QsSUFBSSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtvQkFDM0IsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsQ0FBQztnQkFDaEMsQ0FBQyxDQUFDO2FBQ0w7U0FDSjtLQUNKLENBQUMsQ0FDTCxDQUFDO0lBRUYsT0FBTyxNQUFNLENBQUM7QUFDbEIsQ0FBQyxDQUFDO0FBakJXLFFBQUEsa0JBQWtCLHNCQWlCN0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKS4gWW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSAgICAqXG4gKiAgd2l0aCB0aGUgTGljZW5zZS4gQSBjb3B5IG9mIHRoZSBMaWNlbnNlIGlzIGxvY2F0ZWQgYXQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIG9yIGluIHRoZSAnbGljZW5zZScgZmlsZSBhY2NvbXBhbnlpbmcgdGhpcyBmaWxlLiBUaGlzIGZpbGUgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTICpcbiAqICBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyAgICAqXG4gKiAgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcbmltcG9ydCB7IEJhdGNoR2V0Q29tbWFuZCwgQmF0Y2hHZXRDb21tYW5kT3V0cHV0LCBEeW5hbW9EQkRvY3VtZW50Q2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcbmltcG9ydCB7IENvZ25pdG9BY2Nlc3NUb2tlblBheWxvYWQgfSBmcm9tICdhd3Mtand0LXZlcmlmeS9qd3QtbW9kZWwnO1xuaW1wb3J0IHsgQXV0aFJlc3BvbnNlIH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBjdXN0b21Bd3NDb25maWcgfSBmcm9tICdhd3Mtbm9kZS11c2VyLWFnZW50LWNvbmZpZyc7XG5cbi8qKlxuICogRnVuY3Rpb24gdGhhdCBnZW5lcmF0ZXMgYSBJQU0gcG9saWN5IHRoYXQgZGVuaWVzIGFsbCByZXF1ZXN0cy5cbiAqXG4gKiBAcmV0dXJucyBEZW55IHBvbGljeSBKU09OXG4gKi9cbmV4cG9ydCBjb25zdCBkZW55QWxsUG9saWN5ID0gKCkgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICAgIHByaW5jaXBhbElkOiAnKicsXG4gICAgICAgIHBvbGljeURvY3VtZW50OiB7XG4gICAgICAgICAgICBWZXJzaW9uOiAnMjAxMi0xMC0xNycsXG4gICAgICAgICAgICBTdGF0ZW1lbnQ6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIEFjdGlvbjogJyonLFxuICAgICAgICAgICAgICAgICAgICBFZmZlY3Q6ICdEZW55JyxcbiAgICAgICAgICAgICAgICAgICAgUmVzb3VyY2U6ICcqJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgIH07XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBwb2xpY3kgY29tcG9zZWQgb2YgdGhlIHBvbGljaWVzIHJldHVybmVkIGZvciBhbGwgZ3JvdXBzIHRoZSBpZFRva2VuIGJlbG9uZ3MgdG8uXG4gKiBUaGlzIHBvbGljeSB3aWxsIGFsbG93IHRoZSB1c2VyIGFjY2VzcyB0byBhbnkgQVBJcyB0aGF0IHRoZSBncm91cHMgdGhleSBiZWxvbmcgdG8gaGF2ZSBhY2Nlc3MgdG8uXG4gKlxuICogQHBhcmFtIGlkVG9rZW4gRGVjb2RlZCBKV1QgQXV0aG9yaXphdGlvbiB0b2tlbiByZWNlaXZlZCBpbiByZXF1ZXN0IGhlYWRlci5cbiAqIEByZXR1cm5zXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRQb2xpY3lEb2N1bWVudCA9IGFzeW5jIChpZFRva2VuOiBDb2duaXRvQWNjZXNzVG9rZW5QYXlsb2FkKTogUHJvbWlzZTxBdXRoUmVzcG9uc2U+ID0+IHtcbiAgICBjb25zdCBncm91cHMgPSBpZFRva2VuWydjb2duaXRvOmdyb3VwcyddO1xuICAgIGNvbnN0IHRhYmxlTmFtZSA9IHByb2Nlc3MuZW52LkNPR05JVE9fUE9MSUNZX1RBQkxFX05BTUUhO1xuICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBiYXRjaFF1ZXJ5RHluYW1vREIodGFibGVOYW1lLCBncm91cHMhKTsgLy8gTk9TT05BUiB0eXBlc2NyaXB0OlM0MzI1IC0gcmVtb3ZpbmcgdGhlIGFzc2VydGlvbiBjYXVzZXMgY29tcGlsYXRpb24gZmFpbHVyZVxuICAgIGNvbnNvbGUuZGVidWcoYFJlY2VpdmVkIHJlc3VsdHMgZnJvbSBEeW5hbW9EQjogJHtKU09OLnN0cmluZ2lmeShyZXN1bHRzKX1gKTtcblxuICAgIGlmIChyZXN1bHRzLlJlc3BvbnNlcyAmJiByZXN1bHRzLlJlc3BvbnNlc1t0YWJsZU5hbWVdICYmIHJlc3VsdHMuUmVzcG9uc2VzW3RhYmxlTmFtZV0ubGVuZ3RoID4gMCkge1xuICAgICAgICBsZXQgc3RhdGVtZW50cyA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdFBvbGljeSBvZiByZXN1bHRzLlJlc3BvbnNlc1t0YWJsZU5hbWVdKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHN0YXRlbWVudHMucHVzaCguLi5yZXN1bHRQb2xpY3kucG9saWN5LlN0YXRlbWVudCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgRXJyb3IgcGFyc2luZyBwb2xpY3kgJHtyZXN1bHRQb2xpY3l9LiBHb3QgZXJyb3I6ICR7ZXJyb3J9LiBTa2lwcGluZy5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcHJpbmNpcGFsSWQ6ICcqJyxcbiAgICAgICAgICAgIHBvbGljeURvY3VtZW50OiB7XG4gICAgICAgICAgICAgICAgJ1ZlcnNpb24nOiByZXN1bHRzLlJlc3BvbnNlc1t0YWJsZU5hbWVdWzBdLnBvbGljeS5WZXJzaW9uLFxuICAgICAgICAgICAgICAgICdTdGF0ZW1lbnQnOiBzdGF0ZW1lbnRzXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgICAgIFVzZXJJZDogaWRUb2tlbi5zdWJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIGRlbnlBbGxQb2xpY3koKTtcbn07XG5cbi8qKlxuICogV2lsbCByZXRyaWV2ZSB0aGUgcG9saWNpZXMgZm9yIGFsbCB0aGUgZ3JvdXBzIHRoZSBwcm92aWRlZCB0b2tlbiBiZWxvbmdzIHRvXG4gKlxuICogQHBhcmFtIHRhYmxlTmFtZVxuICogQHBhcmFtIGdyb3Vwc1xuICogQHJldHVybnNcbiAqL1xuZXhwb3J0IGNvbnN0IGJhdGNoUXVlcnlEeW5hbW9EQiA9IGFzeW5jICh0YWJsZU5hbWU6IHN0cmluZywgZ3JvdXBzOiBzdHJpbmdbXSk6IFByb21pc2U8QmF0Y2hHZXRDb21tYW5kT3V0cHV0PiA9PiB7XG4gICAgY29uc3QgZGRiQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KGN1c3RvbUF3c0NvbmZpZygpKTtcbiAgICBjb25zdCBkZGJEb2NDbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oZGRiQ2xpZW50KTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGRkYkRvY0NsaWVudC5zZW5kKFxuICAgICAgICBuZXcgQmF0Y2hHZXRDb21tYW5kKHtcbiAgICAgICAgICAgIFJlcXVlc3RJdGVtczoge1xuICAgICAgICAgICAgICAgIFt0YWJsZU5hbWVdOiB7XG4gICAgICAgICAgICAgICAgICAgIEtleXM6IGdyb3Vwcy5tYXAoKGdyb3VwTmFtZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgZ3JvdXA6IGdyb3VwTmFtZSB9O1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICApO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG4iXX0=