# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
