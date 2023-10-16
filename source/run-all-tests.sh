#!/bin/bash
######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                      			 #
#                                                                                                                    #
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICENSE-2.0                                                                    #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################


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
	pip install --upgrade pip
	pip install wheel
	pip install -r requirements.txt
	pip install -r requirements-dev.txt
	echo "deactivate virtual environment"
	deactivate
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

	# Use -vv for debugging
	python3 -m pytest -sv -vv --cov --cov-report=term-missing --cov-report "xml:$coverage_report_path"
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
		echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
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


# Save the current working directory and set source directory
source_dir=$PWD
cd $source_dir

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
run_ui_project_test ui-deployment

echo "---------------------------------------"
echo "Chat Use Case UI"
echo "---------------------------------------"

run_ui_project_test ui-chat

echo "---------------------------------------"
echo "Running unit test for lambda layers"
echo "---------------------------------------"

cd $source_dir

# install TS node libraries in the layers as required for local unit testing
cd lambda/layers/aws-sdk-lib
npm ci

cd $source_dir
run_python_lambda_test layers/custom_boto3_init "Python User Agent Config Lambda Layer"
run_javascript_lambda_test layers/aws-node-user-agent-config "Typescript User Agent Config Layer"

echo "---------------------------------------"
echo "Running unit test for lambda functions"
echo "---------------------------------------"

run_python_lambda_test chat "Chat Use Case"
run_javascript_lambda_test custom-authorizer "Custom Authorizer"
run_python_lambda_test custom-resource "Custom Resource"
run_python_lambda_test reconcile-data
run_javascript_lambda_test use-case-management "Deployment Platform Use Case Management Lambda"
run_javascript_lambda_test websocket-connectors "Websocket Connector Lambda"

echo "---------------------------------------"
echo "Running CDK infrastructure unit and integration tests"
echo "---------------------------------------"

run_cdk_project_test "CDK - Generative AI Application Builder on AWS"

echo "---------------------------------------"
echo "Executing Unit Tests Complete"
echo "---------------------------------------"