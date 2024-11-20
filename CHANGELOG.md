# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2024-11-20

### Added

-   Support for using Amazon Bedrock Agents ([#49](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/49)).
-   Support for new LLMs available through Amazon Bedrock.
-   Support for [Bedrock cross-region inference profiles](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html).
-   Support for using existing Amazon Cognito user pool configuration when deploying the application and its use cases ([#129](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/pull/129)).

### Changed

-   Use [LCEL](https://python.langchain.com/docs/how_to/#langchain-expression-language-lcel) to replace LangChain `Chains` in the solution's implementation

### Fixed

-   Fixed issue when removing a score threshold on an existing use case ([#154](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/154)).

### Security

-   Updated library versions to address security vulnerabilities

## [2.0.4] - 2024-09-26

### Security

-   Updated node library versions to address security vulnerabilities

## [2.0.3] - 2024-09-17

### Fixed

-   Resolved an issue where use case deployments would fail when manually disabling anonymous metrics via the provided CloudFormation mapping

### Security

-   Updated library versions to address security vulnerabilities

## [2.0.2] - 2024-08-23

### Fixed

-   Issue [#135](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/135), added a new IAM permission for the cognito-idp:GetGroup action to the CloudFormation deployment role (used when deploying use cases). This was required due to a service change.

## [2.0.1] - 2024-08-19

### Changed

-   With the release of [AWS-Solutions-Constructs v2.65.0](https://github.com/awslabs/aws-solutions-constructs/tree/main/source/patterns/%40aws-solutions-constructs/aws-apigatewayv2websocket-sqs), the AWS ApiGateway websocket integration with Amazon SQS Queue is available in the library. Hence the implementation has been updated to use this construct.

### Fixed

-   Issue [#131](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/131) which caused an issue with rendering non-S3 source URLs from vector store for a RAG based use case.
-   Issue [#132](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/132) where configured Guardrails for Amazon Bedrock to have no effect on a use case's text input validations and output responses.
-   Wizard validation failure for SageMaker model selection type, that allowed user to navigate ahead even when the page had failed validations.
-   An AWS WAF rule that blocked larger payloads for HTTP POST request to the `/deployments` endpoint. This restricted configuring large system prompts (over 8 KB) for use case cases.

## [2.0.0] - 2024-08-08

### Added

-   Support for Knowledge Bases for Amazon Bedrock as an option for Retrieval Augmented Generation (RAG) based workflows.
-   Support for Identity Federation (OpenID Connect or SAML 2.0) through Amazon Cognito.
-   Ability to add role-based access control for Amazon Kendra for controlling access over documents that can be retrieved while using RAG based workflows.
-   Provisioned Throughput support for Amazon Bedrock models, allowing custom and provisioned base models to be added as the backing LLMs for the text use case.
-   Enhanced prompt interface, allowing fine-grained control over prompts (including disambiguation prompts for RAG), message history and input lengths.
-   Streamlined upgrade scripts for upgrading from v1.4.x to v2.0.0. For detailed steps, refer to the following [section](https://docs.aws.amazon.com/solutions/latest/generative-ai-application-builder-on-aws/update-the-solution.html)
-   Model support for Amazon Titan Text G1 - Premier

### Changed

-   Deprecated direct Anthropic and Hugging Face LLMs in favour of integrating them through Amazon Bedrock and Amazon SageMaker.
-   Switch login screens from amplify-ui to Cognito Hosted UI to support Identity Federation.
-   Switch from `webpack` to `vite` for building and packaging UI projects.
-   Updates to Node and Python package versions.

## [1.4.5] - 2024-07-22

### Security

-   Updated library versions to address security vulnerabilities

## [1.4.4] - 2024-06-17

### Security

-   Updated library versions to address security vulnerabilities

## [1.4.3] - 2024-06-04

### Security

-   Updated package versions to resolve vulnerabilities

## [1.4.2] - 2024-05-16

### Changed

-   Switched to using `langchain-aws` library for Bedrock and SageMaker LangChain calls instead of `langchain-community`.

## [1.4.1] - 2024-05-07

### Security

-   Updated package versions to resolve vulnerabilities

## [1.4.0] - 2024-04-04

### Added

-   Support for newest Bedrock models: Anthropic Claude v3 and Mistral family of models ([#79](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/79))

### Changed

-   Significantly increased default prompt and chat input character limits. Should now support ~50% of the model's input prompt limit

### Fixed

-   UI input validation misaligned with backend limits ([#80](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/80))
-   Missing hyperlink to solution landing page in README ([#65](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/pull/65))

### Security

-   Updated package versions to resolve vulnerabilities

## [1.3.3] - 2024-03-28

### Fixed

-   Bug with Bedrock Meta/Cohere deployments in RAG configurations ([#83](https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/83))

### Security

-   Updated Node and Python packages to resolve vulnerabilities

## [1.3.2] - 2024-03-07

### Security

-   Updated langchain package versions to resolve a vulnerability

## [1.3.1] - 2024-02-26

### Fixed

-   Add missing IAM action required to provision users for use cases when deploying through deployment dashboard

## [1.3.0] - 2024-02-22

### Added

-   Support for SageMaker as an LLM provider through SageMaker inference endpoints.
-   Ability to deploy both the deployment dashboard and use cases within a VPC, including bringing an existing VPC and allowing the solution to deploy one.
-   Option to return and display the source documents that were referenced when generating a response in RAG use cases.
-   New model-info API in the deployment dashboard stack which can retrieve available providers, models, and model info. Default parameters are now stored for each model and provider combination and are used to pre-populate values in the wizard.

### Changed

-   Refactoring of UI components in the deployment dashboard.
-   Switch to poetry for Python package management, replacing requirements.txt files.
-   Updates to Node and Python package versions.

## [1.2.3] - 2024-02-06

### Fixed

-   Fix AWS IAM policy that causes use case deployments to fail when creating, updating or deleting from the deployment dashboard.

## [1.2.2] - 2024-01-11

### Fixed

-   Pinned `langchain-core` and `langchain-community` versions, fixing a test failure caused by unpinned versions in the `langchain` packages dependencies
-   Removed a race condition causing intermittent failures to deploy the UI infrastructure

### Security

-   Updated Node package versions to resolve security vulnerabilities

## [1.2.1] - 2023-12-21

### Fixed

-   Unit tests failure due to a change in the underlying anthropic library.

## [1.2.0] - 2023-12-18

### Added

-   Support for Amazon Titan Text Lite, Anthropic Claude v2.1, Cohere Command models, and Meta Llama 2 Chat models

### Changed

-   Increase the cap on the max number of docs retrieved in the Amazon Kendra retriever (for RAG use cases) from 5 to 100, to match the API limit

### Fixed

-   Fix typo in UI deployment instructions (#26)
-   Fix bug causing failures with dictionary type advanced model parameters
-   Fixed bug causing erroneous error messages to appear to user in long running conversations

### Security

-   Updated Python and Node package versions to resolve security vulnerabilities

## [1.1.1] - 2023-11-16

### Fixed

-   Remove NodeJS 16 from supported runtimes, which was not supported

### Security

-   Updated Python and Node package versions to resolve security vulnerabilities

## [1.1.0] - 2023-11-02

### Added

-   Markdown rendering in Chat UI LLM responses

### Changed

-   Increased prompt and chat input limits to 2000 and 2500 characters respectively

### Security

-   Updated package versions to resolve security vulnerabilities

## [1.0.1] - 2023-10-26

### Security

-   Updated package versions to resolve security vulnerabilities.

## [1.0.0] - 2023-10-16

### Added

-   Initial Release