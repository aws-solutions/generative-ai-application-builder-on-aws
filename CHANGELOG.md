# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
