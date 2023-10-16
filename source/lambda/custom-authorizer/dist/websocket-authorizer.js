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
exports.handler = exports.jwtVerifier = void 0;
const aws_jwt_verify_1 = require("aws-jwt-verify");
const get_policy_1 = require("./utils/get-policy");
/**
 * Cognito JWT verifier to validate incoming APIGateway websocket authorization request.
 * The CognitoJwtVerifier caches the JWKS file in memory and persists while the lambda is live.
 */
exports.jwtVerifier = aws_jwt_verify_1.CognitoJwtVerifier.create({
    userPoolId: process.env.USER_POOL_ID,
    tokenUse: 'access',
    clientId: process.env.CLIENT_ID
});
/**
 * Lambda function to validate incoming APIGateway websocket authorization request.
 * The authorization token is expected to be in the 'Authorization' header.
 * It is expected to be a JWT ID token generted by AWS Cognito, and will be validated using the
 * `aws-jwt-verify` library.
 *
 * The function will return a policy with the effect 'Allow' if the token is valid, and 'Deny' otherwise.
 *
 * @param event Request authorization event received from APIGateway websocket api
 * @param context Lamdba event context
 * @returns Object containing `principalId`, `policyDocument` and optionally `context` and `usageIdentifierKey`
 */
const handler = async (event) => {
    var _a;
    try {
        const encodedToken = (_a = event.queryStringParameters) === null || _a === void 0 ? void 0 : _a.Authorization;
        if (!encodedToken) {
            throw new Error('Authorization query string parameter is missing');
        }
        const decodedTokenPayload = await exports.jwtVerifier.verify(encodedToken, {
            clientId: process.env.CLIENT_ID
        });
        return (0, get_policy_1.getPolicyDocument)(decodedTokenPayload);
    }
    catch (error) {
        console.error(error.message);
        // apigateway needs this exact error so it returns a 401 response instead of a 500
        throw new Error('Unauthorized');
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vic29ja2V0LWF1dGhvcml6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi93ZWJzb2NrZXQtYXV0aG9yaXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O3dIQVd3SDs7O0FBR3hILG1EQUFvRDtBQUNwRCxtREFBdUQ7QUFFdkQ7OztHQUdHO0FBQ1UsUUFBQSxXQUFXLEdBQUcsbUNBQWtCLENBQUMsTUFBTSxDQUFDO0lBQ2pELFVBQVUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQWE7SUFDckMsUUFBUSxFQUFFLFFBQVE7SUFDbEIsUUFBUSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBVTtDQUNuQyxDQUFDLENBQUM7QUFFSDs7Ozs7Ozs7Ozs7R0FXRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUF1QyxFQUF5QixFQUFFOztJQUM1RixJQUFJO1FBQ0EsTUFBTSxZQUFZLEdBQUcsTUFBQSxLQUFLLENBQUMscUJBQXFCLDBDQUFFLGFBQWEsQ0FBQztRQUNoRSxJQUFJLENBQUMsWUFBWSxFQUFFO1lBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO1NBQ3RFO1FBRUQsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLG1CQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRTtZQUMvRCxRQUFRLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFVO1NBQ25DLENBQUMsQ0FBQztRQUVILE9BQU8sSUFBQSw4QkFBaUIsRUFBQyxtQkFBbUIsQ0FBQyxDQUFDO0tBQ2pEO0lBQUMsT0FBTyxLQUFVLEVBQUU7UUFDakIsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDN0Isa0ZBQWtGO1FBQ2xGLE1BQU0sSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7S0FDbkM7QUFDTCxDQUFDLENBQUM7QUFqQlcsUUFBQSxPQUFPLFdBaUJsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiAgQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpLiBZb3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlICAgICpcbiAqICB3aXRoIHRoZSBMaWNlbnNlLiBBIGNvcHkgb2YgdGhlIExpY2Vuc2UgaXMgbG9jYXRlZCBhdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgb3IgaW4gdGhlICdsaWNlbnNlJyBmaWxlIGFjY29tcGFueWluZyB0aGlzIGZpbGUuIFRoaXMgZmlsZSBpcyBkaXN0cmlidXRlZCBvbiBhbiAnQVMgSVMnIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgKlxuICogIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGV4cHJlc3Mgb3IgaW1wbGllZC4gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zICAgICpcbiAqICBhbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuaW1wb3J0IHsgQXV0aFJlc3BvbnNlLCBBUElHYXRld2F5UmVxdWVzdEF1dGhvcml6ZXJFdmVudCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgQ29nbml0b0p3dFZlcmlmaWVyIH0gZnJvbSAnYXdzLWp3dC12ZXJpZnknO1xuaW1wb3J0IHsgZ2V0UG9saWN5RG9jdW1lbnQgfSBmcm9tICcuL3V0aWxzL2dldC1wb2xpY3knO1xuXG4vKipcbiAqIENvZ25pdG8gSldUIHZlcmlmaWVyIHRvIHZhbGlkYXRlIGluY29taW5nIEFQSUdhdGV3YXkgd2Vic29ja2V0IGF1dGhvcml6YXRpb24gcmVxdWVzdC5cbiAqIFRoZSBDb2duaXRvSnd0VmVyaWZpZXIgY2FjaGVzIHRoZSBKV0tTIGZpbGUgaW4gbWVtb3J5IGFuZCBwZXJzaXN0cyB3aGlsZSB0aGUgbGFtYmRhIGlzIGxpdmUuXG4gKi9cbmV4cG9ydCBjb25zdCBqd3RWZXJpZmllciA9IENvZ25pdG9Kd3RWZXJpZmllci5jcmVhdGUoe1xuICAgIHVzZXJQb29sSWQ6IHByb2Nlc3MuZW52LlVTRVJfUE9PTF9JRCEsXG4gICAgdG9rZW5Vc2U6ICdhY2Nlc3MnLFxuICAgIGNsaWVudElkOiBwcm9jZXNzLmVudi5DTElFTlRfSUQhXG59KTtcblxuLyoqXG4gKiBMYW1iZGEgZnVuY3Rpb24gdG8gdmFsaWRhdGUgaW5jb21pbmcgQVBJR2F0ZXdheSB3ZWJzb2NrZXQgYXV0aG9yaXphdGlvbiByZXF1ZXN0LlxuICogVGhlIGF1dGhvcml6YXRpb24gdG9rZW4gaXMgZXhwZWN0ZWQgdG8gYmUgaW4gdGhlICdBdXRob3JpemF0aW9uJyBoZWFkZXIuXG4gKiBJdCBpcyBleHBlY3RlZCB0byBiZSBhIEpXVCBJRCB0b2tlbiBnZW5lcnRlZCBieSBBV1MgQ29nbml0bywgYW5kIHdpbGwgYmUgdmFsaWRhdGVkIHVzaW5nIHRoZVxuICogYGF3cy1qd3QtdmVyaWZ5YCBsaWJyYXJ5LlxuICpcbiAqIFRoZSBmdW5jdGlvbiB3aWxsIHJldHVybiBhIHBvbGljeSB3aXRoIHRoZSBlZmZlY3QgJ0FsbG93JyBpZiB0aGUgdG9rZW4gaXMgdmFsaWQsIGFuZCAnRGVueScgb3RoZXJ3aXNlLlxuICpcbiAqIEBwYXJhbSBldmVudCBSZXF1ZXN0IGF1dGhvcml6YXRpb24gZXZlbnQgcmVjZWl2ZWQgZnJvbSBBUElHYXRld2F5IHdlYnNvY2tldCBhcGlcbiAqIEBwYXJhbSBjb250ZXh0IExhbWRiYSBldmVudCBjb250ZXh0XG4gKiBAcmV0dXJucyBPYmplY3QgY29udGFpbmluZyBgcHJpbmNpcGFsSWRgLCBgcG9saWN5RG9jdW1lbnRgIGFuZCBvcHRpb25hbGx5IGBjb250ZXh0YCBhbmQgYHVzYWdlSWRlbnRpZmllcktleWBcbiAqL1xuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlSZXF1ZXN0QXV0aG9yaXplckV2ZW50KTogUHJvbWlzZTxBdXRoUmVzcG9uc2U+ID0+IHtcbiAgICB0cnkge1xuICAgICAgICBjb25zdCBlbmNvZGVkVG9rZW4gPSBldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnM/LkF1dGhvcml6YXRpb247XG4gICAgICAgIGlmICghZW5jb2RlZFRva2VuKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0F1dGhvcml6YXRpb24gcXVlcnkgc3RyaW5nIHBhcmFtZXRlciBpcyBtaXNzaW5nJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBkZWNvZGVkVG9rZW5QYXlsb2FkID0gYXdhaXQgand0VmVyaWZpZXIudmVyaWZ5KGVuY29kZWRUb2tlbiwge1xuICAgICAgICAgICAgY2xpZW50SWQ6IHByb2Nlc3MuZW52LkNMSUVOVF9JRCFcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGdldFBvbGljeURvY3VtZW50KGRlY29kZWRUb2tlblBheWxvYWQpO1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgLy8gYXBpZ2F0ZXdheSBuZWVkcyB0aGlzIGV4YWN0IGVycm9yIHNvIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UgaW5zdGVhZCBvZiBhIDUwMFxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYXV0aG9yaXplZCcpO1xuICAgIH1cbn07XG4iXX0=