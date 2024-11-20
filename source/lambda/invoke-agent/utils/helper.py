# *********************************************************************************************************************
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#                                                                                                                    #
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICENSE-2.0                                                                    #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
# ********************************************************************************************************************#

from aws_lambda_powertools import Logger, Metrics, Tracer
from utils import METRICS_SERVICE_NAME, CloudWatchNamespaces

logger = Logger(utc=True)
tracer = Tracer()
_metrics_namespaces = dict()


@tracer.capture_method
def get_metrics_client(namespace: CloudWatchNamespaces) -> Metrics:
    """
    Retrieves or creates a Metrics client for the specified CloudWatch namespace.

    This function manages a cache of Metrics clients for different CloudWatch namespaces.
    If a client for the requested namespace already exists, it returns the cached client.
    Otherwise, it creates a new client, caches it, and then returns it.

    Args:
        namespace (CloudWatchNamespaces): The CloudWatch namespace for which to get or create a Metrics client.

    Returns:
        Metrics: A Metrics client object for the specified namespace.

    Note:
        This function uses a global dictionary to cache Metrics clients.
        It is decorated with @tracer.capture_method for performance monitoring.

    Example:
        >>> client = get_metrics_client(CloudWatchNamespaces.AWS_BEDROCK_AGENT)
        >>> # Use the client to publish metrics
        >>> client.put_metric(name="InvocationCount", unit=MetricUnit.Count, value=1)
    """

    global _metrics_namespaces

    if namespace not in _metrics_namespaces:
        logger.debug(f"Cache miss for {namespace}. Creating a new cache entry.")
        _metrics_namespaces[namespace] = Metrics(namespace=namespace.value, service=METRICS_SERVICE_NAME)

    return _metrics_namespaces[namespace]
