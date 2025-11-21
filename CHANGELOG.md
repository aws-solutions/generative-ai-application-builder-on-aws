# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0] - 2025-11-20

### Added

- Multi-Agent workflow orchestration to address complex tasks with multiple coordinated agents.
- Agent Builder use case for configuring, deploying, and managing AI Agents from the Management Dashboard.
- MCP Server deployment using images, Lambda functions, OpenAPI specs, or Smitty files.
- Multimodal input capabilities for Agent Builder and workflow use cases.
- AWS Lambda provisioned concurrency support for text and bedrock agent use cases to improve performance and reduce cold starts.

### Security

- Upgraded js-yaml to `3.14.2` and `4.1.1` to mitigate CVE-2025-64718
- Upgraded glob to `10.5.0` to mitigate CVE-2025-64756
- Upgraded langchain-core to `0.3.80` to mitigate CVE-2025-65106

## [3.0.7] - 2025-11-12

### Security

- Upgraded vite to `5.4.21` and `6.4.1` to mitigate [CVE-2025-62522](https://avd.aquasec.com/nvd/cve-2025-62522)
- Upgraded @react-native-community/cli to `^17.0.1` to mitigate [CVE-2025-11953](https://avd.aquasec.com/nvd/2025/cve-2025-11953/)

## [3.0.6] - 2025-10-14

### Changed

- Upgraded langchain-core to `0.3.74`
- Upgraded langchain-aws to `0.2.31`
- Upgraded aws-lambda-powertools to `3.19.0`
- Upgraded botocore to `1.40.15`
- Upgraded boto3 to `1.40.15`

### Security

- Upgraded langchain to `0.3.27` to mitigate [CVE-2025-6985](https://avd.aquasec.com/nvd/2025/cve-2025-6985/)

## [3.0.5] - 2025-09-18

### Security

- Upgraded axios to `1.12.2`
- Upgraded vite to `5.4.20` and `6.3.6`

## [3.0.4] - 2025-08-14

### Fixed

- Bug where the IAM policy being returned by the REST and Websocket custom authorizers to grant access to API endpoints exceeded the role policy character limit, leading to failures when a large number use cases were deployed.
- Bug where updates to a use case deployed with VPC failed due to an incorrect API request.

### Security

- Upgraded aws-cdk-lib to `2.193.0`
- Upgraded aws-cdk to `2.1024.0`

## [3.0.3] - 2025-07-31

### Fixed

- Bug where oversized limit WAF rule was preventing update of use cases deployed with very large prompts.
- Removed model-info files for unsupported mistral models to remove from quick start list.

## [3.0.2] - 2025-07-24

### Security

- Upgraded @eslint/plugin-kit to `0.3.4`
- Upgraded form-data to `4.0.4`
- Upgraded on-headers to `1.1.0`

## [3.0.1] - 2025-06-26

### Security

- Upgraded urllib3 to `2.5.0`
- Upgraded requests to `2.32.4`
- Upgraded brace-expansion to `2.0.2`

### Added

- Support for Kendra GenAI Index backed Bedrock knowledge bases.

### Changed

- Deployment UI to show an error when a regular user attempts to log in.
- Custom Resource IAM Role to be scoped down to only necessary DynamoDB Tables.

### Fixed

- Bug where CloudFormation deployment would fail using existing Cognito resources due to user/group creation conflict. ([#193](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/193)).
- Bug where history in prompt for SageMaker models was being replaced by LangChain BaseMessage objects instead of just the content of the messages.
- Bug where context in prompt was being replaced by LangChain Document objects instead of the content of the documents.
- Bug where Langchain layer poetry lock wasn't being respected.

## [3.0.0] - 2025-05-29

### Added

- Feedback collection mechanism for LLM chat responses with positive/negative feedback, feedback categories and reason.
- Support for Bedrock Converse APIs for improved model support.
- Support for all Amazon Bedrock models through the use of model IDs or inference profiles.
- Use case details API to retrieve deployment information.
- Bedrock token usage, stop reason and feedback metrics in CloudWatch dashboard.
- Friendly names and descriptions on model selection UI.
- Streaming support for Agent UseCases.

### Changed

- Chat UI with a New/Refreshed look and enhanced error handling.
- Python runtime from 3.12 to Python 3.13.
- Use Case ID to expect a full 36-character UUID.
- Prompt step for Bedrock model provider to require system prompt without {input} and {history} placeholders as a result of switching to Converse APIs. {context} placeholder is still required for RAG use cases.

### Fixed

- Bug where documents returned from Bedrock knowledge bases without a title were not properly displayed in the UI.

## [2.1.9] - 2025-05-22

### Security

- Upgraded setuptools to `80.8.0`
- Upgraded vite in ui-chat to `6.3.4`
- Upgraded vite in ui-deployment to `5.4.19`

## [2.1.8] - 2025-04-28

### Security

- Upgraded h11 to `0.16.0`
- Upgraded aws-cdk-lib to `2.189.1`

## [2.1.7] - 2025-04-08

### Security

- Upgraded image-size to `1.2.1`
- Upgraded aws-cdk-lib to `2.187.0`
- Upgraded vite to `5.4.17`

### Fixed

- Stack deployment failures performed through `cdk deploy`

## [2.1.6] - 2025-03-12

### Security

- Upgraded axios to `1.8.2`
- Upgraded prismjs to `1.30.0`
- Upgraded @babel/helpers and @babel/runtime to `7.26.10`

## [2.1.5] - 2025-03-06

### Security

- Updated package versions to address security vulnerabilities

## [2.1.4] - 2025-02-07

### Security

- Updated package versions to address security vulnerabilities

## [2.1.3] - 2025-01-30

### Fixed

- Fixed a bug where source documents were not displaying when streaming was disabled ([#164](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/164)).
- Fixed a bug where the prompt editing disable feature would result in UI failures ([#165](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/165)).
- Fixed a bug where a new conversation was created whenever a Chat error occurs ([#166](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/166)).
- Fixed annonymized metrics collection by updating to supported timeframe of every 3 hours

### Security

- Updated package versions to address security vulnerabilities

## [2.1.2] - 2025-01-14

### Security

- Updated python library versions to address security vulnerabilities

### Changed

- Standardized license headers across source files.

## [2.1.1] - 2024-12-17

### Changed

- AWS Lambda runtime for Nodejs from 20.x to 22.x
- Updated `pyproject.toml` spec updated to use python 3.12 or higher
- AWS SDK (boto3 and Javascript SDK) version updates
- Updated warnings and references documentation when selecting 'BYO Cognito user pool'.

### Fixed

- An issue with RAG based deployment, specifically when using Anthropic Claude 3.5 v2 under Amazon Bedrock that caused incorrect prompt to be associated with the configuration.
- An issue related to streaming responses in use case deployments, specifically when using Llama 3.2 under Amazon Bedrock.

### Security

- Updated node library versions to address security vulnerabilities

## [2.1.0] - 2024-11-20

### Added

- Support for using Amazon Bedrock Agents ([#49](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/49)).
- Support for new LLMs available through Amazon Bedrock.
- Support for [Bedrock cross-region inference profiles](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html).
- Support for using existing Amazon Cognito user pool configuration when deploying the application and its use cases ([#129](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/pull/129)).

### Changed

- Use [LCEL](https://python.langchain.com/docs/how_to/#langchain-expression-language-lcel) to replace LangChain `Chains` in the solution's implementation

### Fixed

- Fixed issue when removing a score threshold on an existing use case ([#154](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/154)).

### Security

- Updated library versions to address security vulnerabilities

## [2.0.4] - 2024-09-26

### Security

- Updated node library versions to address security vulnerabilities

## [2.0.3] - 2024-09-17

### Fixed

- Resolved an issue where use case deployments would fail when manually disabling anonymous metrics via the provided CloudFormation mapping

### Security

- Updated library versions to address security vulnerabilities

## [2.0.2] - 2024-08-23

### Fixed

- Issue [#135](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/135), added a new IAM permission for the cognito-idp:GetGroup action to the CloudFormation deployment role (used when deploying use cases). This was required due to a service change.

## [2.0.1] - 2024-08-19

### Changed

- With the release of [AWS-Solutions-Constructs v2.65.0](https://github.com/awslabs/aws-solutions-constructs/tree/main/source/patterns/%40aws-solutions-constructs/aws-apigatewayv2websocket-sqs), the AWS ApiGateway websocket integration with Amazon SQS Queue is available in the library. Hence the implementation has been updated to use this construct.

### Fixed

- Issue [#131](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/131) which caused an issue with rendering non-S3 source URLs from vector store for a RAG based use case.
- Issue [#132](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/132) where configured Guardrails for Amazon Bedrock to have no effect on a use case's text input validations and output responses.
- Wizard validation failure for SageMaker model selection type, that allowed user to navigate ahead even when the page had failed validations.
- An AWS WAF rule that blocked larger payloads for HTTP POST request to the `/deployments` endpoint. This restricted configuring large system prompts (over 8 KB) for use case cases.

## [2.0.0] - 2024-08-08

### Added

- Support for Knowledge Bases for Amazon Bedrock as an option for Retrieval Augmented Generation (RAG) based workflows.
- Support for Identity Federation (OpenID Connect or SAML 2.0) through Amazon Cognito.
- Ability to add role-based access control for Amazon Kendra for controlling access over documents that can be retrieved while using RAG based workflows.
- Provisioned Throughput support for Amazon Bedrock models, allowing custom and provisioned base models to be added as the backing LLMs for the text use case.
- Enhanced prompt interface, allowing fine-grained control over prompts (including disambiguation prompts for RAG), message history and input lengths.
- Streamlined upgrade scripts for upgrading from v1.4.x to v2.0.0. For detailed steps, refer to the following [section](https://docs.aws.amazon.com/solutions/latest/generative-ai-application-builder-on-aws/update-the-solution.html)
- Model support for Amazon Titan Text G1 - Premier

### Changed

- Deprecated direct Anthropic and Hugging Face LLMs in favour of integrating them through Amazon Bedrock and Amazon SageMaker.
- Switch login screens from amplify-ui to Cognito Hosted UI to support Identity Federation.
- Switch from `webpack` to `vite` for building and packaging UI projects.
- Updates to Node and Python package versions.

## [1.4.5] - 2024-07-22

### Security

- Updated library versions to address security vulnerabilities

## [1.4.4] - 2024-06-17

### Security

- Updated library versions to address security vulnerabilities

## [1.4.3] - 2024-06-04

### Security

- Updated package versions to resolve vulnerabilities

## [1.4.2] - 2024-05-16

### Changed

- Switched to using `langchain-aws` library for Bedrock and SageMaker LangChain calls instead of `langchain-community`.

## [1.4.1] - 2024-05-07

### Security

- Updated package versions to resolve vulnerabilities

## [1.4.0] - 2024-04-04

### Added

- Support for newest Bedrock models: Anthropic Claude v3 and Mistral family of models ([#79](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/79))

### Changed

- Significantly increased default prompt and chat input character limits. Should now support ~50% of the model's input prompt limit

### Fixed

- UI input validation misaligned with backend limits ([#80](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/80))
- Missing hyperlink to solution landing page in README ([#65](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/pull/65))

### Security

- Updated package versions to resolve vulnerabilities

## [1.3.3] - 2024-03-28

### Fixed

- Bug with Bedrock Meta/Cohere deployments in RAG configurations ([#83](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/83))

### Security

- Updated Node and Python packages to resolve vulnerabilities

## [1.3.2] - 2024-03-07

### Security

- Updated langchain package versions to resolve a vulnerability

## [1.3.1] - 2024-02-26

### Fixed

- Add missing IAM action required to provision users for use cases when deploying through deployment dashboard

## [1.3.0] - 2024-02-22

### Added

- Support for SageMaker as an LLM provider through SageMaker inference endpoints.
- Ability to deploy both the deployment dashboard and use cases within a VPC, including bringing an existing VPC and allowing the solution to deploy one.
- Option to return and display the source documents that were referenced when generating a response in RAG use cases.
- New model-info API in the deployment dashboard stack which can retrieve available providers, models, and model info. Default parameters are now stored for each model and provider combination and are used to pre-populate values in the wizard.

### Changed

- Refactoring of UI components in the deployment dashboard.
- Switch to poetry for Python package management, replacing requirements.txt files.
- Updates to Node and Python package versions.

## [1.2.3] - 2024-02-06

### Fixed

- Fix AWS IAM policy that causes use case deployments to fail when creating, updating or deleting from the deployment dashboard.

## [1.2.2] - 2024-01-11

### Fixed

- Pinned `langchain-core` and `langchain-community` versions, fixing a test failure caused by unpinned versions in the `langchain` packages dependencies
- Removed a race condition causing intermittent failures to deploy the UI infrastructure

### Security

- Updated Node package versions to resolve security vulnerabilities

## [1.2.1] - 2023-12-21

### Fixed

- Unit tests failure due to a change in the underlying anthropic library.

## [1.2.0] - 2023-12-18

### Added

- Support for Amazon Titan Text Lite, Anthropic Claude v2.1, Cohere Command models, and Meta Llama 2 Chat models

### Changed

- Increase the cap on the max number of docs retrieved in the Amazon Kendra retriever (for RAG use cases) from 5 to 100, to match the API limit

### Fixed

- Fix typo in UI deployment instructions (#26)
- Fix bug causing failures with dictionary type advanced model parameters
- Fixed bug causing erroneous error messages to appear to user in long running conversations

### Security

- Updated Python and Node package versions to resolve security vulnerabilities

## [1.1.1] - 2023-11-16

### Fixed

- Remove NodeJS 16 from supported runtimes, which was not supported

### Security

- Updated Python and Node package versions to resolve security vulnerabilities

## [1.1.0] - 2023-11-02

### Added

- Markdown rendering in Chat UI LLM responses

### Changed

- Increased prompt and chat input limits to 2000 and 2500 characters respectively

### Security

- Updated package versions to resolve security vulnerabilities

## [1.0.1] - 2023-10-26

### Security

- Updated package versions to resolve security vulnerabilities.

## [1.0.0] - 2023-10-16

### Added

- Initial Release
