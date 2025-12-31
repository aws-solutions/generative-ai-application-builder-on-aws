#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

# This script runs all tests for the root CDK project, as well as any microservices, Lambda functions, or dependency
# source code packages. These include unit tests, and integration tests
#
# This script is called by the ../initialize-repo.sh file and the buildspec.yml file. It is important that this script
# be tested and validated to ensure that all available test fixtures are run.
#
# The if/then blocks are for error handling. They will cause the script to stop executing if an error is thrown from the
# node process running the test case(s). Removing them or not using them for additional calls with result in the
# script continuing to execute despite an error being thrown.

[ "$DEBUG" == 'true' ] && set -x
set -e

setup_python_env() {
	if [ -d "./.venv-test" ]; then
		echo "Reusing already setup python venv in ./.venv-test. Delete ./.venv-test if you want a fresh one created."
		return
	fi
	echo "Setting up python venv"
	python3 -m venv .venv-test
	echo "Initiating virtual environment"
	source .venv-test/bin/activate
	echo "Installing python packages"
	pip install --upgrade pip setuptools
	pip install poetry
	poetry build
	poetry install
	echo "deactivate virtual environment"
	deactivate
}

setup_uv() {
	echo "Installing UV for ECR container tests..."
	
	if command -v pip3 &> /dev/null; then
		pip3 install "uv>=0.5.0"
		
		# Verify installation
		if command -v uv &> /dev/null; then
			echo "✅ UV installed successfully: $(uv --version)"
			return 0
		fi
	fi
	
	# If pip installation failed, provide instructions and exit
	echo "❌ ERROR: Could not install UV."
	echo "   Please install UV manually:"
	echo "   - pip install uv>=0.5.0"
	echo "   - brew install uv (macOS)"
	echo "   - https://docs.astral.sh/uv/getting-started/installation/"
	echo ""
}

install_lambda_layer() {
	lambda_name=$1
	lambda_description=$2

	echo "------------------------------------------------------------------------------"
	echo "[Test] Python Lambda: $lambda_name, $lambda_description"
	echo "------------------------------------------------------------------------------"
	cd $source_dir/lambda/$lambda_name

	[ "${CLEAN:-true}" = "true" ] && rm -fr .venv-test

	setup_python_env

	[ "${CLEAN:-true}" = "true" ] && rm -fr .venv-test
}

run_python_lambda_test() {
	lambda_name=$1
	lambda_description=$2
	echo "------------------------------------------------------------------------------"
	echo "[Test] Python Lambda: $lambda_name, $lambda_description"
	echo "------------------------------------------------------------------------------"
	cd $source_dir/lambda/$lambda_name

	[ "${CLEAN:-true}" = "true" ] && rm -fr .venv-test

	setup_python_env

	echo "Initiating virtual environment"
	source .venv-test/bin/activate

	# setup coverage report path
	mkdir -p $source_dir/test/coverage-reports
	coverage_report_path=$source_dir/test/coverage-reports/$lambda_name.coverage.xml
	echo "coverage report path set to $coverage_report_path"

	if poetry install --dry-run | grep "pytest-xdist"; then
		echo "Parallelism supported. Running poetry tests in parallel."
		poetry run pytest -sv -vv --cov --cov-report=term-missing --cov-report "xml:$coverage_report_path" -n auto
	else
		echo "Parallelism not supported. Running poetry tests sequentially."
		poetry run pytest -sv -vv --cov --cov-report=term-missing --cov-report "xml:$coverage_report_path"
	fi
	if [ "$?" = "1" ]; then
		echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
		exit 1
	fi
	sed -i -e "s,<source>$source_dir,<source>source,g" $coverage_report_path
	echo "deactivate virtual environment"
	deactivate

	if [ "${CLEAN:-true}" = "true" ]; then
		rm -fr .venv-test
		# Note: leaving $source_dir/test/coverage-reports to allow further processing of coverage reports
		rm -fr coverage
		rm .coverage
	fi
}

run_python_scripts_test() {
	lambda_name=$1
	lambda_description=$2
	echo "------------------------------------------------------------------------------"
	echo "[Test] Python Lambda: $lambda_name, $lambda_description"
	echo "------------------------------------------------------------------------------"
	cd $source_dir/scripts/$lambda_name

	[ "${CLEAN:-true}" = "true" ] && rm -fr .venv-test

	setup_python_env

	echo "Initiating virtual environment"
	source .venv-test/bin/activate

	echo "------------------------------------------------------------------------------"

	# setup coverage report path
	mkdir -p $source_dir/test/coverage-reports
	coverage_report_path=$source_dir/test/coverage-reports/$lambda_name.coverage.xml
	echo "coverage report path set to $coverage_report_path"

	# Use -vv for debugging
	poetry run pytest -sv -vv --cov --cov-report=term-missing --cov-report "xml:$coverage_report_path"
	if [ "$?" = "1" ]; then
		echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
		exit 1
	fi
	sed -i -e "s,<source>$source_dir,<source>source,g" $coverage_report_path
	echo "deactivate virtual environment"
	deactivate

	if [ "${CLEAN:-true}" = "true" ]; then
		rm -fr .venv-test
		# Note: leaving $source_dir/test/coverage-reports to allow further processing of coverage reports
		rm -fr coverage
		rm .coverage
	fi
}

run_javascript_lambda_test() {
	lambda_name=$1
	lambda_description=$2
	echo "------------------------------------------------------------------------------"
	echo "[Test] Javascript Lambda: $lambda_name, $lambda_description"
	echo "------------------------------------------------------------------------------"
	cd $source_dir/lambda/$lambda_name

	[ "${CLEAN:-true}" = "true" ] && npm run clean
	npm ci
	npm run build
	npm test
	if [ "$?" = "1" ]; then
		echo "(deployment/run-unit-tests.sh) ERROR: there is likely output above." 1>&2
		exit 1
	fi
	[ "${CLEAN:-true}" = "true" ] && rm -rf coverage/lcov-report
	mkdir -p $source_dir/test/coverage-reports/jest/$lambda_name
	coverage_report_path=$source_dir/test/coverage-reports/jest/$lambda_name
	rm -fr $coverage_report_path
	mv coverage $coverage_report_path
}

run_cdk_project_test() {
	component_description=$1
	component_name=infrastructure
	echo "------------------------------------------------------------------------------"
	echo "[Test] $component_description"
	echo "------------------------------------------------------------------------------"
	cd $source_dir/infrastructure

	export SKIP_PRE_BUILD=true
	echo "setting SKIP_PRE_BUILD to $SKIP_PRE_BUILD"
	export SKIP_BUILD=true
	echo "setting SKIP_BUILD to $SKIP_BUILD"
	export SKIP_CLEAN_UP=true
	echo "setting SKIP_CLEAN_UP to $SKIP_CLEAN_UP"
	export SKIP_UNIT_TEST=true
	echo "setting SKIP_UNIT_TEST to $SKIP_UNIT_TEST"

	[ "${CLEAN:-true}" = "true" ] && npm run clean
	npm ci
	npm run build

	## Option to suppress the Override Warning messages while synthesizing using CDK
	# Suppressing this as the warnings do not handle cdk.Duration type well and throw an exception
	export overrideWarningsEnabled=false
	echo "setting override warning to $overrideWarningsEnabled"

	npm run test

	if [ "$?" = "1" ]; then
		echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
		exit 1
	fi
	[ "${CLEAN:-true}" = "true" ] && rm -rf coverage/lcov-report
	mkdir -p $source_dir/test/coverage-reports/jest
	coverage_report_path=$source_dir/test/coverage-reports/jest/$component_name
	rm -fr $coverage_report_path
	mv coverage $coverage_report_path

	# Unsetting the set variable to suppress warnings
	unset overrideWarningsEnabled
	echo "unsetting SKIP_PRE_BUILD, SKIP_BUILD, SKIP_CLEAN_UP, SKIP_UNIT_TEST"
	unset SKIP_PRE_BUILD
	unset SKIP_BUILD
	unset SKIP_CLEAN_UP
	unset SKIP_UNIT_TEST
}

run_ui_project_test() {
	component_name=$1
	echo "------------------------------------------------------------------------------"
	echo "[Test] $component_name"
	echo "------------------------------------------------------------------------------"
	cd $source_dir/$component_name

	[ "${CLEAN:-true}" = "true" ] && npm run clean
	npm ci
	npm run build
	npm run test
	if [ "$?" = "1" ]; then
		echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
		exit 1
	fi
	[ "${CLEAN:-true}" = "true" ] && rm -rf coverage/lcov-report
	mkdir -p $source_dir/test/coverage-reports/jest/$component_name
	coverage_report_path=$source_dir/test/coverage-reports/jest/$component_name
	rm -fr $coverage_report_path
	mv coverage $coverage_report_path
}

run_ecr_container_tests() {
	container_name=$1
	container_description=$2
	echo "------------------------------------------------------------------------------"
	echo "[Test] ECR Container: $container_name, $container_description"
	echo "------------------------------------------------------------------------------"
	cd $source_dir/../deployment/ecr/$container_name
	if [ -f "scripts/run_unit_tests.sh" ]; then
		echo "Running $container_description container tests..."
		./scripts/run_unit_tests.sh
		if [ "$?" != "0" ]; then
			echo "(deployment/run-unit-tests.sh) ERROR: ECR container tests failed." 1>&2
			exit 1
		fi
	else
		echo "⚠️  ECR container test script not found, skipping..."
	fi
}

timer() {
	start=$(date +%s)
	"$@"  # Executes all arguments as a command
	end=$(date +%s)
	echo "Time elapsed: $((end - start)) seconds - $@"
}

# switch to source directory to run the test
cd ../source

# Save the current working directory and set source directory
source_dir=$PWD
cd $source_dir
echo "---------------------------------------"
echo "source directory is $source_dir"
echo "---------------------------------------"

# Option to clean or not clean the unit test environment before and after running tests.
# The environment variable CLEAN has default of 'true' and can be overwritten by caller
# by setting it to 'false'. Particularly,
#    $ CLEAN=false ./run-all-tests.sh
#
CLEAN="${CLEAN:-true}"

# The sequence of execution is important. The list has been sequenced to accomodate for any dependencies
# between the various modules.

echo "---------------------------------------"
echo "Running UI Unit Tests"
echo "---------------------------------------"

cd $source_dir

echo "---------------------------------------"
echo "Use Case Management UI"
echo "---------------------------------------"
timer run_ui_project_test ui-deployment

echo "---------------------------------------"
echo "Chat Use Case UI"
echo "---------------------------------------"

timer run_ui_project_test ui-chat

echo "---------------------------------------"
echo "Running unit test for lambda layers"
echo "---------------------------------------"

cd $source_dir

# install TS node libraries in the layers as required for local unit testing
cd lambda/layers/aws-node-user-agent-config
timer npm ci
timer npm run build

cd $source_dir

cd lambda/layers/aws-sdk-lib
timer npm ci
timer npm run build

cd $source_dir
timer install_lambda_layer layers/aws_boto3 "Boto3 SDK Layer"
timer install_lambda_layer layers/langchain "LangChain Layer"
timer run_python_lambda_test layers/custom_boto3_init "Python User Agent Config Lambda Layer"
timer run_javascript_lambda_test layers/aws-node-user-agent-config "Typescript User Agent Config Layer"

echo "---------------------------------------"
echo "Running unit test for lambda functions"
echo "---------------------------------------"

timer run_python_lambda_test chat "Chat Use Case"
timer run_python_lambda_test invoke-agent "Bedrock Agent"
timer run_javascript_lambda_test custom-authorizer "Custom Authorizer"
timer run_python_lambda_test custom-resource "Custom Resource"
timer run_python_lambda_test ext-idp-group-mapper "IDP Group Mapper for Cognito JWT pre-token generation"
timer run_javascript_lambda_test model-info "Backing function for Model Info API"
timer run_javascript_lambda_test feedback-management "Feedback Management Lambda"
timer run_javascript_lambda_test use-case-details "Use Case Details Lambda"
timer run_javascript_lambda_test use-case-management "Deployment Platform Use Case Management Lambda"
timer run_javascript_lambda_test websocket-connectors "Websocket Connector Lambda"

echo "_______________________________________"
echo "Running unit test for scripts"
echo "_______________________________________"
timer run_python_scripts_test v2_migration "Migration script for use cases to move from 1.x to 2.x and higher"

echo "---------------------------------------"
echo "Running CDK infrastructure unit and integration tests"
echo "---------------------------------------"

timer run_cdk_project_test "CDK - Generative AI Application Builder on AWS"

echo "---------------------------------------"
echo "Running ECR container unit tests"
echo "---------------------------------------"

# Ensure UV is installed for ECR container tests
setup_uv

# Run ECR container tests
timer run_ecr_container_tests "gaab-strands-agent" "GAAB Strands Agent"
timer run_ecr_container_tests "gaab-strands-common" "GAAB Strands Common"
timer run_ecr_container_tests "gaab-strands-workflow-agent" "GAAB Strands Workflow Agent"

cd $source_dir

echo "---------------------------------------"
echo "Executing Unit Tests Complete"
echo "---------------------------------------"
