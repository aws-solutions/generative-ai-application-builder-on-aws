# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Custom Tools - Extensible custom tools system for GAAB Strands agents
"""

# Auto-import all custom tools to ensure they get registered
import importlib
import logging
import pkgutil

# Import setup components
from .setup import (
    BaseCustomTool,
    CustomToolsRegistry,
    ToolMetadata,
    ToolRequirements,
    auto_attach_when,
    custom_tool,
    requires,
)

logger = logging.getLogger(__name__)


def _discover_and_import_tools():
    """
    Auto-discover and automatically import all custom tools in this package
    to ensure they get registered with the CustomToolsRegistry.
    Manually importing each one is not required.
    """
    try:
        # Get the current package path
        package_path = __path__
        package_name = __name__

        logger.info(f"Starting custom tools discovery in package: {package_name}")

        # Iterate through all modules in the custom_tools package
        for module_info in pkgutil.iter_modules(package_path):
            module_name = module_info.name

            logger.debug(f"Found module: {module_name}")

            # Skip the setup package
            if module_name == "setup":
                logger.debug("Skipping setup module")
                continue

            try:
                # Import the module to trigger tool registration
                full_module_name = f"{package_name}.{module_name}"
                logger.info(f"Importing custom tool module: {full_module_name}")
                importlib.import_module(full_module_name)
                logger.info(f"Successfully imported custom tool module: {module_name}")
            except Exception as e:
                logger.warning(f"Failed to import custom tool module {module_name}: {e}")

        # Log the final registry state
        from .setup import CustomToolsRegistry

        registered_tools = CustomToolsRegistry.list_tool_ids()
        logger.info(f"Custom tools discovery complete. Registered tools: {registered_tools}")

    except Exception as e:
        logger.error(f"Error during custom tools discovery: {e}")


# Perform auto-discovery when this package is imported
_discover_and_import_tools()

__all__ = [
    "CustomToolsRegistry",
    "BaseCustomTool",
    "custom_tool",
    "requires",
    "auto_attach_when",
    "ToolMetadata",
    "ToolRequirements",
]
