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
exports.formatError = exports.formatResponse = void 0;
/**
 * Utility function to convert any success response into a Http 200 response with the
 * proper formatting and headers.
 *
 * @param {any} body Response message. This will be strigified and inserted into 'body'
 * @param {[key: string]: string} extraHeaders any extra headers to include in response.
 *         any key in extraHeaders will override any header in the defaultHeaders with the same key.
 * @returns
 */
const formatResponse = (body, extraHeaders = {}) => {
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin': '*' // NOSONAR - javascript:S5122 - Domain not known at this point.
    };
    const headers = typeof extraHeaders === 'undefined' ? defaultHeaders : { ...defaultHeaders, ...extraHeaders };
    body = typeof body === 'string' ? body : JSON.stringify(body);
    let response = {
        'statusCode': 200,
        'headers': headers,
        'isBase64Encoded': false,
        'body': body
    };
    return response;
};
exports.formatResponse = formatResponse;
/**
 * Formats a error object into a HTTP response with an error status code.
 * If error is a string, it is converted to a Object with parameter key `message`.
 * Sends a 400 error response.
 * @param {message} Error body
 * @param {statusCode} Error status code
 * @param {extraHeaders} any extra headers to include in response.
 * @returns
 */
const formatError = ({ message, statusCode, extraHeaders }) => {
    const defaultHeaders = {
        'Content-Type': 'text/plain',
        'x-amzn-ErrorType': 'CustomExecutionError',
        'Access-Control-Allow-Origin': '*' // NOSONAR - javascript:S5122 - Domain not known at this point.
    };
    return {
        statusCode: statusCode !== null && statusCode !== void 0 ? statusCode : '400',
        headers: {
            ...defaultHeaders,
            ...extraHeaders
        },
        isBase64Encoded: false,
        body: message
    };
};
exports.formatError = formatError;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1yZXNwb25zZS1mb3JtYXR0ZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdXRpbHMvaHR0cC1yZXNwb25zZS1mb3JtYXR0ZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7d0hBV3dIOzs7QUFFeEg7Ozs7Ozs7O0dBUUc7QUFDSSxNQUFNLGNBQWMsR0FBRyxDQUMxQixJQUF3QyxFQUN4QyxlQUEwQyxFQUFFLEVBQzlDLEVBQUU7SUFDQSxNQUFNLGNBQWMsR0FBRztRQUNuQixjQUFjLEVBQUUsa0JBQWtCO1FBQ2xDLDhCQUE4QixFQUFFLDZDQUE2QztRQUM3RSw4QkFBOEIsRUFBRSxrQkFBa0I7UUFDbEQsa0NBQWtDLEVBQUUsSUFBSTtRQUN4Qyw2QkFBNkIsRUFBRSxHQUFHLENBQUMsK0RBQStEO0tBQ3JHLENBQUM7SUFDRixNQUFNLE9BQU8sR0FBRyxPQUFPLFlBQVksS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLGNBQWMsRUFBRSxHQUFHLFlBQVksRUFBRSxDQUFDO0lBQzlHLElBQUksR0FBRyxPQUFPLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5RCxJQUFJLFFBQVEsR0FBRztRQUNYLFlBQVksRUFBRSxHQUFHO1FBQ2pCLFNBQVMsRUFBRSxPQUFPO1FBQ2xCLGlCQUFpQixFQUFFLEtBQUs7UUFDeEIsTUFBTSxFQUFFLElBQUk7S0FDZixDQUFDO0lBQ0YsT0FBTyxRQUFRLENBQUM7QUFDcEIsQ0FBQyxDQUFDO0FBcEJXLFFBQUEsY0FBYyxrQkFvQnpCO0FBRUY7Ozs7Ozs7O0dBUUc7QUFDSSxNQUFNLFdBQVcsR0FBRyxDQUFDLEVBQ3hCLE9BQU8sRUFDUCxVQUFVLEVBQ1YsWUFBWSxFQUtmLEVBQUUsRUFBRTtJQUNELE1BQU0sY0FBYyxHQUFHO1FBQ25CLGNBQWMsRUFBRSxZQUFZO1FBQzVCLGtCQUFrQixFQUFFLHNCQUFzQjtRQUMxQyw2QkFBNkIsRUFBRSxHQUFHLENBQUMsK0RBQStEO0tBQ3JHLENBQUM7SUFFRixPQUFPO1FBQ0gsVUFBVSxFQUFFLFVBQVUsYUFBVixVQUFVLGNBQVYsVUFBVSxHQUFJLEtBQUs7UUFDL0IsT0FBTyxFQUFFO1lBQ0wsR0FBRyxjQUFjO1lBQ2pCLEdBQUcsWUFBWTtTQUNsQjtRQUNELGVBQWUsRUFBRSxLQUFLO1FBQ3RCLElBQUksRUFBRSxPQUFPO0tBQ2hCLENBQUM7QUFDTixDQUFDLENBQUM7QUF4QlcsUUFBQSxXQUFXLGVBd0J0QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiAgQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpLiBZb3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlICAgICpcbiAqICB3aXRoIHRoZSBMaWNlbnNlLiBBIGNvcHkgb2YgdGhlIExpY2Vuc2UgaXMgbG9jYXRlZCBhdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgb3IgaW4gdGhlICdsaWNlbnNlJyBmaWxlIGFjY29tcGFueWluZyB0aGlzIGZpbGUuIFRoaXMgZmlsZSBpcyBkaXN0cmlidXRlZCBvbiBhbiAnQVMgSVMnIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgKlxuICogIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGV4cHJlc3Mgb3IgaW1wbGllZC4gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zICAgICpcbiAqICBhbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuLyoqXG4gKiBVdGlsaXR5IGZ1bmN0aW9uIHRvIGNvbnZlcnQgYW55IHN1Y2Nlc3MgcmVzcG9uc2UgaW50byBhIEh0dHAgMjAwIHJlc3BvbnNlIHdpdGggdGhlXG4gKiBwcm9wZXIgZm9ybWF0dGluZyBhbmQgaGVhZGVycy5cbiAqXG4gKiBAcGFyYW0ge2FueX0gYm9keSBSZXNwb25zZSBtZXNzYWdlLiBUaGlzIHdpbGwgYmUgc3RyaWdpZmllZCBhbmQgaW5zZXJ0ZWQgaW50byAnYm9keSdcbiAqIEBwYXJhbSB7W2tleTogc3RyaW5nXTogc3RyaW5nfSBleHRyYUhlYWRlcnMgYW55IGV4dHJhIGhlYWRlcnMgdG8gaW5jbHVkZSBpbiByZXNwb25zZS5cbiAqICAgICAgICAgYW55IGtleSBpbiBleHRyYUhlYWRlcnMgd2lsbCBvdmVycmlkZSBhbnkgaGVhZGVyIGluIHRoZSBkZWZhdWx0SGVhZGVycyB3aXRoIHRoZSBzYW1lIGtleS5cbiAqIEByZXR1cm5zXG4gKi9cbmV4cG9ydCBjb25zdCBmb3JtYXRSZXNwb25zZSA9IChcbiAgICBib2R5OiBzdHJpbmcgfCB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9LFxuICAgIGV4dHJhSGVhZGVyczogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfSA9IHt9XG4pID0+IHtcbiAgICBjb25zdCBkZWZhdWx0SGVhZGVycyA9IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnT3JpZ2luLFgtUmVxdWVzdGVkLVdpdGgsQ29udGVudC1UeXBlLEFjY2VwdCcsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogJ09QVElPTlMsUE9TVCxHRVQnLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHMnOiB0cnVlLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonIC8vIE5PU09OQVIgLSBqYXZhc2NyaXB0OlM1MTIyIC0gRG9tYWluIG5vdCBrbm93biBhdCB0aGlzIHBvaW50LlxuICAgIH07XG4gICAgY29uc3QgaGVhZGVycyA9IHR5cGVvZiBleHRyYUhlYWRlcnMgPT09ICd1bmRlZmluZWQnID8gZGVmYXVsdEhlYWRlcnMgOiB7IC4uLmRlZmF1bHRIZWFkZXJzLCAuLi5leHRyYUhlYWRlcnMgfTtcbiAgICBib2R5ID0gdHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnID8gYm9keSA6IEpTT04uc3RyaW5naWZ5KGJvZHkpO1xuICAgIGxldCByZXNwb25zZSA9IHtcbiAgICAgICAgJ3N0YXR1c0NvZGUnOiAyMDAsXG4gICAgICAgICdoZWFkZXJzJzogaGVhZGVycyxcbiAgICAgICAgJ2lzQmFzZTY0RW5jb2RlZCc6IGZhbHNlLFxuICAgICAgICAnYm9keSc6IGJvZHlcbiAgICB9O1xuICAgIHJldHVybiByZXNwb25zZTtcbn07XG5cbi8qKlxuICogRm9ybWF0cyBhIGVycm9yIG9iamVjdCBpbnRvIGEgSFRUUCByZXNwb25zZSB3aXRoIGFuIGVycm9yIHN0YXR1cyBjb2RlLlxuICogSWYgZXJyb3IgaXMgYSBzdHJpbmcsIGl0IGlzIGNvbnZlcnRlZCB0byBhIE9iamVjdCB3aXRoIHBhcmFtZXRlciBrZXkgYG1lc3NhZ2VgLlxuICogU2VuZHMgYSA0MDAgZXJyb3IgcmVzcG9uc2UuXG4gKiBAcGFyYW0ge21lc3NhZ2V9IEVycm9yIGJvZHlcbiAqIEBwYXJhbSB7c3RhdHVzQ29kZX0gRXJyb3Igc3RhdHVzIGNvZGVcbiAqIEBwYXJhbSB7ZXh0cmFIZWFkZXJzfSBhbnkgZXh0cmEgaGVhZGVycyB0byBpbmNsdWRlIGluIHJlc3BvbnNlLlxuICogQHJldHVybnNcbiAqL1xuZXhwb3J0IGNvbnN0IGZvcm1hdEVycm9yID0gKHtcbiAgICBtZXNzYWdlLFxuICAgIHN0YXR1c0NvZGUsXG4gICAgZXh0cmFIZWFkZXJzXG59OiB7XG4gICAgbWVzc2FnZTogc3RyaW5nO1xuICAgIHN0YXR1c0NvZGU/OiBzdHJpbmc7XG4gICAgZXh0cmFIZWFkZXJzPzogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfTtcbn0pID0+IHtcbiAgICBjb25zdCBkZWZhdWx0SGVhZGVycyA9IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3BsYWluJyxcbiAgICAgICAgJ3gtYW16bi1FcnJvclR5cGUnOiAnQ3VzdG9tRXhlY3V0aW9uRXJyb3InLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonIC8vIE5PU09OQVIgLSBqYXZhc2NyaXB0OlM1MTIyIC0gRG9tYWluIG5vdCBrbm93biBhdCB0aGlzIHBvaW50LlxuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiBzdGF0dXNDb2RlID8/ICc0MDAnLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAuLi5kZWZhdWx0SGVhZGVycyxcbiAgICAgICAgICAgIC4uLmV4dHJhSGVhZGVyc1xuICAgICAgICB9LFxuICAgICAgICBpc0Jhc2U2NEVuY29kZWQ6IGZhbHNlLFxuICAgICAgICBib2R5OiBtZXNzYWdlXG4gICAgfTtcbn07XG4iXX0=