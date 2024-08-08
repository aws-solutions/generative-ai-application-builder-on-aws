# GAAB v2 Migration User Guide

## Introduction

The [gaab_v2_migration.py](../../source/scripts/v2_migration/gaab_v2_migration.py) script is designed to to support existing use cases created by GAAB v1.X in an upgraded GAAB v2.X deployment, which introduces changes to the configuration data structure and storage mechanism. Specifically, it migrates configuration data from the AWS Systems Manager Parameter Store (SSM) to a newly created DynamoDB table.

## Why is the Migration Needed?

The GAAB V2 release brings several improvements and new features, including:

-   Improved Configuration Management: The new configuration data structure is designed to be more flexible and scalable, and now supports many new parameters to tune in the wizard or manually. Where previously manual configuration changes required editing stringified JSON in SSM Parameter store, users can now edit parameters natively in DynamoDB.

-   Support for larger prompts: By storing configuration data in DynamoDB instead of SSM Parameter Store, GAAB V2 can leverage a far higher max configuration size, which includes prompt templates (SSM max param size is 8kb vs 400kb for a record in DynamoDB).

Because of these improvements and the move to DynamoDB, use cases created with previous versions of GAAB will not be compatible with the new v2.X versions. If you wish to view/edit your old deployments after upgrading your deployment dashboard to v2.X, you will need to run this script.

## Running the Migration Script

To run the gaab_v2_migration.py script and migrate your configuration data, follow these steps:

### Prerequisites

1. Ensure you have the following installed on your system:

    - [Python >= 3.11, <=3.12.1](https://www.python.org/)
        - _Note: normal python installations should include support for `ensurepip` and `pip`; however, if running in an environment without these packages you will need to manually install them (e.g. a minimal docker image). See [pip's installation guide](https://pip.pypa.io/en/stable/installation/) for details._
    - [Poetry](https://python-poetry.org/docs/)
        - Can be installed with `pip install poetry`
    - [AWS CLI](https://aws.amazon.com/cli/)

2. Ensure you are authenticated with an AWS account (via the AWS CLI) with the following permissions to access the corresponding DynamoDB and SSM Parameter Store in the desired region:

    - Use cases table
        - dynamodb:Scan
        - dynamodb:ConditionCheckItem
        - dynamodb:Query
        - dynamodb:GetItem
        - dynamodb:UpdateItem
        - dynamodb:PutItem
    - Config table
        - dynamodb:PutItem
    - SSM Parameter
        - ssm:GetParameter
        - ssm:DeleteParameter (optional)

    Note that there are many ways to configure Boto3 (the Python AWS SDK implementation used by this script) credentials for accessing AWS (listed [here](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/credentials.html)). You may need to set environment variables such as `AWS_PROFILE` (if using a profile from your .aws/config file) or `AWS_DEFAULT_REGION`, `AWS_ACCESS_KEY_ID`, etc...

3. Verify that the UseCaseTable and ConfigTableDynamoDB tables exist in your AWS account. Their names should be visible in the outputs of the DeploymentPlatformStack in CloudFormation

4. Install the required Python dependencies by running `poetry install` in the source/scripts/v2_migration directory

### Execution

The migration script requires the names of the use cases and config tables as parameters. You can either:

1. Add the values into the constants `USE_CASE_TABLE_NAME` and `CONFIG_TABLE_NAME` at the top of the `gaab_v2_migration.py` file, then run `python gaab_v2_migration.py`

2. Provide the values as command line arguments: `python gaab_v2_migration.py -u <use_case_table_name> -c <config_table_name>`

**Note**: By default the script does not delete the old SSM parameters, however you can pass the `-d` flag to the script as a command line argument if you wish to have them deleted
