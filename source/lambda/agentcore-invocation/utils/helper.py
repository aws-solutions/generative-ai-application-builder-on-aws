# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import boto3
from datetime import datetime

from aws_lambda_powertools import Logger, Metrics, Tracer

from utils.constants import METRICS_SERVICE_NAME, CloudWatchNamespaces

logger = Logger(utc=True)
tracer = Tracer()
_metrics_namespaces = dict()
_service_clients = dict()
_session = None


@tracer.capture_method
def get_session():
    """
    Get or create a boto3 session.

    Returns:
        boto3.session.Session: The boto3 session
    """
    global _session
    if not _session:
        _session = boto3.session.Session()
    return _session


@tracer.capture_method
def get_service_client(service_name, **kwargs):
    """
    Get or create a boto3 service client.

    This function manages a cache of service clients for different AWS services.
    If a client for the requested service already exists, it returns the cached client.
    Otherwise, it creates a new client, caches it, and then returns it.

    Args:
        service_name (str): The name of the AWS service
        **kwargs: Additional arguments to pass to the client constructor

    Returns:
        boto3 client: The service client for the specified service
    """
    global _service_clients
    session = get_session()

    cache_key = f"{service_name}_{hash(frozenset(kwargs.items()) if kwargs else frozenset())}"

    if cache_key not in _service_clients:
        logger.debug(f"Cache miss for {service_name}. Creating a new one and cache it")
        _service_clients[cache_key] = session.client(service_name, **kwargs)

    return _service_clients[cache_key]


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
        >>> client = get_metrics_client(CloudWatchNamespaces.AGENTCORE_INVOCATION)
        >>> # Use the client to publish metrics
        >>> client.put_metric(name="InvocationCount", unit=MetricUnit.Count, value=1)
    """

    global _metrics_namespaces

    if namespace not in _metrics_namespaces:
        logger.debug(f"Cache miss for {namespace}. Creating a new cache entry.")
        _metrics_namespaces[namespace] = Metrics(namespace=namespace.value, service=METRICS_SERVICE_NAME)

    return _metrics_namespaces[namespace]


def json_serializer(obj):
    """
    Custom JSON serializer that handles datetime objects and other non-JSON serializable objects.

    Args:
        obj: The object to serialize.

    Returns:
        str or obj: ISO format string if obj is a datetime, original object if JSON serializable,
                    or string representation for non-serializable objects.
    """
    if isinstance(obj, datetime):
        return obj.isoformat()
    try:
        json.dumps(obj)
        return obj
    except Exception as ex:
        logger.info(
            f"Serializing failed for object: {obj}. Exception: {ex}. Converting the object into string for JSON dumps..."
        )
        return str(obj)
