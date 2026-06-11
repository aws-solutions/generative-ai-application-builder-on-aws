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
#
# Execution Modes:
#   PARALLEL=true  — run independent test suites concurrently (intended for CodeBuild)
#   PARALLEL=false — run all suites sequentially (default, for local development)
#
# Environment Variables:
#   PARALLEL  — "true" enables parallel mode; default is "false" (sequential)
#   CLEAN     — "false" skips venv cleanup; default is "true" for local runs

[ "$DEBUG" == 'true' ] && set -x
set -e

# ==============================================================================
# Configuration
# ==============================================================================

# Parallel execution mode: set PARALLEL=true to run test suites concurrently
PARALLEL="${PARALLEL:-false}"

# Maximum number of concurrent test suites. 0 = unlimited (all at once).
# Set to a lower value (e.g., 10) to prevent resource exhaustion on shared build environments.
MAX_PARALLEL="${MAX_PARALLEL:-0}"

# Maximum workers per test suite (pytest -n, vitest forks). 0 = auto-detect (uses all cores).
# Limit this when running many suites in parallel to prevent OOM from too many forked processes.
WORKERS_PER_SUITE="${WORKERS_PER_SUITE:-0}"

# Option to clean or not clean the unit test environment before and after running tests.
CLEAN="${CLEAN:-true}"

# ==============================================================================
# Test Runner Functions
# ==============================================================================

setup_python_env() {
	if [ -d "./.venv-test" ]; then
		echo "Reusing already setup python venv in ./.venv-test. Delete ./.venv-test if you want a fresh one created."
		return
	fi
	echo "Setting up python venv with uv"
	uv venv .venv-test
	uv sync --frozen
}

setup_uv() {
	if ! command -v uv &> /dev/null; then
		echo "❌ ERROR: uv is not installed. Please install uv first:"
		echo "   - pip install uv"
		echo "   - brew install uv (macOS)"
		echo "   - https://docs.astral.sh/uv/getting-started/installation/"
		exit 1
	fi
	echo "✅ uv is available: $(uv --version)"
}

install_lambda_layer() {
	lambda_name=$1
	lambda_description=$2

	echo "------------------------------------------------------------------------------"
	echo "[Test] Python Lambda: $lambda_name, $lambda_description"
	echo "------------------------------------------------------------------------------"
	cd $source_dir/lambda/$lambda_name

	# Note: Using if/fi instead of [ cond ] && cmd because the latter returns exit code 1
	# when the condition is false, which triggers set -e and aborts the script.
	if [ "${CLEAN:-true}" = "true" ]; then rm -fr .venv-test; fi

	setup_python_env

	if [ "${CLEAN:-true}" = "true" ]; then rm -fr .venv-test; fi
}

run_python_lambda_test() {
	lambda_name=$1
	lambda_description=$2
	echo "------------------------------------------------------------------------------"
	echo "[Test] Python Lambda: $lambda_name, $lambda_description"
	echo "------------------------------------------------------------------------------"
	cd $source_dir/lambda/$lambda_name

	# Note: Using if/fi instead of [ cond ] && cmd because the latter returns exit code 1
	# when the condition is false, which triggers set -e and aborts the script.
	if [ "${CLEAN:-true}" = "true" ]; then rm -fr .venv-test; fi

	setup_python_env

	# setup coverage report path
	mkdir -p $source_dir/test/coverage-reports
	coverage_report_path=$source_dir/test/coverage-reports/$lambda_name.coverage.xml
	echo "coverage report path set to $coverage_report_path"

	# Use WORKERS_PER_SUITE to control pytest-xdist parallelism (0 = auto)
	local pytest_workers="auto"
	if [ "$WORKERS_PER_SUITE" -gt 0 ] 2>/dev/null; then
		pytest_workers="$WORKERS_PER_SUITE"
	fi

	uv run pytest -sv -vv --cov --cov-report=term-missing --cov-report "xml:$coverage_report_path" -n "$pytest_workers"
	if [ "$?" = "1" ]; then
		echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
		exit 1
	fi
	sed -i -e "s,<source>$source_dir,<source>source,g" $coverage_report_path
	sed -i -e "s,filename=\"$source_dir/,filename=\",g" $coverage_report_path
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

	# Note: Using if/fi instead of [ cond ] && cmd because the latter returns exit code 1
	# when the condition is false, which triggers set -e and aborts the script.
	if [ "${CLEAN:-true}" = "true" ]; then rm -fr .venv-test; fi

	setup_python_env

	echo "------------------------------------------------------------------------------"

	# setup coverage report path
	mkdir -p $source_dir/test/coverage-reports
	coverage_report_path=$source_dir/test/coverage-reports/$lambda_name.coverage.xml
	echo "coverage report path set to $coverage_report_path"

	# Use -vv for debugging
	uv run pytest -sv -vv --cov --cov-report=term-missing --cov-report "xml:$coverage_report_path"
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

	# Note: Using if/fi instead of [ cond ] && cmd because the latter returns exit code 1
	# when the condition is false, which triggers set -e and aborts the script.
	if [ "${CLEAN:-true}" = "true" ]; then npm run clean; fi
	npm ci
	npm run build

	# Use WORKERS_PER_SUITE to limit Jest worker processes (prevents OOM in parallel mode)
	if [ "$WORKERS_PER_SUITE" -gt 0 ] 2>/dev/null; then
		npm test -- --maxWorkers="$WORKERS_PER_SUITE"
	else
		npm test
	fi
	if [ "$?" = "1" ]; then
		echo "(deployment/run-unit-tests.sh) ERROR: there is likely output above." 1>&2
		exit 1
	fi
	if [ "${CLEAN:-true}" = "true" ]; then rm -rf coverage/lcov-report; fi
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

	# Note: Using if/fi instead of [ cond ] && cmd because the latter returns exit code 1
	# when the condition is false, which triggers set -e and aborts the script.
	if [ "${CLEAN:-true}" = "true" ]; then npm run clean; fi
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
	if [ "${CLEAN:-true}" = "true" ]; then rm -rf coverage/lcov-report; fi
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

	# Note: Using if/fi instead of [ cond ] && cmd because the latter returns exit code 1
	# when the condition is false, which triggers set -e and aborts the script.
	if [ "${CLEAN:-true}" = "true" ]; then npm run clean; fi
	# Skip npm ci if node_modules already exists (installed in Phase 1 for parallel mode)
	if [ ! -d "node_modules" ]; then
		npm ci
	fi
	npm run build
	npm run test
	if [ "$?" = "1" ]; then
		echo "(source/run-all-tests.sh) ERROR: there is likely output above." 1>&2
		exit 1
	fi
	if [ "${CLEAN:-true}" = "true" ]; then rm -rf coverage/lcov-report; fi
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

		# Fix coverage.xml paths for SonarQube - rewrite absolute CodeBuild paths
		local project_root_prefix
		project_root_prefix=$(cd "$source_dir/.." && pwd)
		if [ -f "coverage.xml" ]; then
			echo "Fixing coverage.xml paths for SonarQube..."
			sed -i -e "s,<source>$project_root_prefix/,<source>,g" coverage.xml
			sed -i -e "s,filename=\"$project_root_prefix/,filename=\",g" coverage.xml
			# Add container-relative source path if not already present
			if ! grep -q "<source>deployment/ecr/$container_name</source>" coverage.xml; then
				sed -i -e "s,<source></source>,<source></source>\n                <source>deployment/ecr/$container_name</source>,g" coverage.xml
			fi
		fi
		if [ -f "gaab-strands-common/coverage.xml" ]; then
			echo "Fixing gaab-strands-common/coverage.xml paths for SonarQube..."
			sed -i -e "s,<source>$project_root_prefix/,<source>,g" gaab-strands-common/coverage.xml
			sed -i -e "s,filename=\"$project_root_prefix/,filename=\",g" gaab-strands-common/coverage.xml
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

# ==============================================================================
# Parallel Execution Infrastructure
# ==============================================================================

# Format elapsed seconds to human-readable duration (e.g., "2m 14s", "45s")
format_duration() {
	local seconds=$1
	if [ $seconds -ge 60 ]; then
		local minutes=$((seconds / 60))
		local remaining_seconds=$((seconds % 60))
		echo "${minutes}m ${remaining_seconds}s"
	else
		echo "${seconds}s"
	fi
}

# Arrays for tracking background processes
declare -a PIDS=()
declare -a SUITE_NAMES=()
declare -a LOG_FILES=()
declare -a SUITE_STATUS=()
declare -a SUITE_START_TIMES=()
declare -a SUITE_ELAPSED=()

# Launch a command in the background, redirect output to a log file, and track its PID
run_in_background() {
	local suite_name="$1"
	shift
	local log_file="$source_dir/test/logs/${suite_name}.log"

	# MAX_PARALLEL throttle: if at capacity, wait for one suite to finish before launching
	if [ "$MAX_PARALLEL" -gt 0 ]; then
		local running_count=0
		for i in "${!PIDS[@]}"; do
			if [ "${SUITE_STATUS[$i]}" = "running" ]; then
				running_count=$((running_count + 1))
			fi
		done
		while [ $running_count -ge $MAX_PARALLEL ]; do
			sleep 1
			running_count=0
			for i in "${!PIDS[@]}"; do
				if [ "${SUITE_STATUS[$i]}" = "running" ]; then
					if kill -0 "${PIDS[$i]}" 2>/dev/null; then
						running_count=$((running_count + 1))
					else
						# Suite finished while waiting for a slot — record it
						wait "${PIDS[$i]}"
						local exit_code=$?
						local elapsed=$(( $(date +%s) - ${SUITE_START_TIMES[$i]} ))
						SUITE_ELAPSED[$i]=$(format_duration $elapsed)
						if [ $exit_code -eq 0 ]; then
							SUITE_STATUS[$i]="passed"
							THROTTLE_PASSED=$((THROTTLE_PASSED + 1))
						else
							SUITE_STATUS[$i]="failed"
							THROTTLE_ANY_FAILED=1
						fi
						THROTTLE_COMPLETED=$((THROTTLE_COMPLETED + 1))
						print_suite_completion "${SUITE_NAMES[$i]}" "${SUITE_STATUS[$i]}" "${SUITE_ELAPSED[$i]}" "$THROTTLE_COMPLETED" "$THROTTLE_TOTAL" "$THROTTLE_PASSED"
					fi
				fi
			done
		done
	fi

	(
		cd "$source_dir"
		"$@"
	) > "$log_file" 2>&1 &

	local pid=$!
	PIDS+=($pid)
	SUITE_NAMES+=("$suite_name")
	LOG_FILES+=("$log_file")
	SUITE_STATUS+=("running")
	SUITE_START_TIMES+=($(date +%s))
	echo "Started $suite_name (PID: $pid, log: $log_file)"
}

# Print a single append-only progress line when a suite completes.
# Format: ✅ suite-name (duration) [===>-----------] X/Y passed
# This approach prints one line per completion — no reprinting, works in CodeBuild logs.
print_suite_completion() {
	local name="$1"
	local status="$2"
	local elapsed="$3"
	local completed="$4"
	local total="$5"
	local passed="$6"

	# Build progress bar (14 chars wide)
	local bar_width=14
	local filled=$(( completed * bar_width / total ))
	local empty=$(( bar_width - filled ))
	local bar=""
	if [ $filled -gt 0 ]; then
		bar=$(printf '%0.s=' $(seq 1 $filled))
	fi
	bar="${bar}>"
	if [ $empty -gt 0 ]; then
		bar="${bar}$(printf '%0.s-' $(seq 1 $empty))"
	fi
	# Trim to exact bar_width + 1 (for the >)
	bar=$(echo "$bar" | cut -c1-$((bar_width + 1)))

	local icon="✅"
	if [ "$status" = "failed" ]; then
		icon="❌"
	fi

	printf " %s %-30s (%s) [%s] %d/%d passed\n" "$icon" "$name" "$elapsed" "$bar" "$passed" "$total"
}

# Wait for background processes to complete one at a time, updating status as each finishes.
# Uses `wait -n` on bash 4.3+ with a polling fallback for older versions.
# Returns non-zero if any suite failed.
collect_results_progressive() {
	# Start from where throttle left off (suites that completed while waiting for slots)
	local completed=${THROTTLE_COMPLETED:-0}
	local total=${#PIDS[@]}
	local any_failed=${THROTTLE_ANY_FAILED:-0}
	local passed_count=${THROTTLE_PASSED:-0}

	# Check bash version for wait -n support (requires bash 4.3+)
	# Note: wait -n -p (to capture finished PID) requires bash 5.1+
	local bash_major=${BASH_VERSINFO[0]}
	local bash_minor=${BASH_VERSINFO[1]}
	local has_wait_n_p=false
	if [ "$bash_major" -gt 5 ] || ([ "$bash_major" -eq 5 ] && [ "$bash_minor" -ge 1 ]); then
		has_wait_n_p=true
	fi

	echo ""
	echo "═══════════════════════════════════════════════════════════"
	echo " TEST EXECUTION PROGRESS"
	echo "═══════════════════════════════════════════════════════════"

	if [ "$has_wait_n_p" = true ]; then
		# Use wait -n -p to detect completions one at a time (bash 5.1+)
		while [ $completed -lt $total ]; do
			local finished_pid=""
			wait -n -p finished_pid "${PIDS[@]}" 2>/dev/null
			local exit_code=$?

			# Find which suite this PID belongs to
			for i in "${!PIDS[@]}"; do
				if [ "${PIDS[$i]}" = "$finished_pid" ]; then
					local elapsed=$(( $(date +%s) - ${SUITE_START_TIMES[$i]} ))
					SUITE_ELAPSED[$i]=$(format_duration $elapsed)

					if [ $exit_code -eq 0 ]; then
						SUITE_STATUS[$i]="passed"
						passed_count=$((passed_count + 1))
					else
						SUITE_STATUS[$i]="failed"
						any_failed=1
					fi

					completed=$((completed + 1))
					print_suite_completion "${SUITE_NAMES[$i]}" "${SUITE_STATUS[$i]}" "${SUITE_ELAPSED[$i]}" "$completed" "$total" "$passed_count"

					break
				fi
			done
		done
	else
		# Polling fallback for bash < 5.1
		while [ $completed -lt $total ]; do
			for i in "${!PIDS[@]}"; do
				if [ "${SUITE_STATUS[$i]}" = "running" ]; then
					# Check if PID is still alive
					if ! kill -0 "${PIDS[$i]}" 2>/dev/null; then
						# Process finished, get exit code
						wait "${PIDS[$i]}"
						local exit_code=$?
						local elapsed=$(( $(date +%s) - ${SUITE_START_TIMES[$i]} ))
						SUITE_ELAPSED[$i]=$(format_duration $elapsed)

						if [ $exit_code -eq 0 ]; then
							SUITE_STATUS[$i]="passed"
							passed_count=$((passed_count + 1))
						else
							SUITE_STATUS[$i]="failed"
							any_failed=1
						fi

						completed=$((completed + 1))
						print_suite_completion "${SUITE_NAMES[$i]}" "${SUITE_STATUS[$i]}" "${SUITE_ELAPSED[$i]}" "$completed" "$total" "$passed_count"
					fi
				fi
			done

			# If not all completed yet, sleep before polling again
			if [ $completed -lt $total ]; then
				sleep 2
			fi
		done
	fi

	echo "═══════════════════════════════════════════════════════════"

	# Print final summary
	print_final_summary

	return $any_failed
}

# Print a final summary table after all suites complete
print_final_summary() {
	local total=${#PIDS[@]}
	local passed_count=0
	local failed_count=0
	local failed_names=()
	local failed_logs=()

	for i in "${!PIDS[@]}"; do
		if [ "${SUITE_STATUS[$i]}" = "passed" ]; then
			passed_count=$((passed_count + 1))
		elif [ "${SUITE_STATUS[$i]}" = "failed" ]; then
			failed_count=$((failed_count + 1))
			failed_names+=("${SUITE_NAMES[$i]}")
			failed_logs+=("${LOG_FILES[$i]}")
		fi
	done

	echo ""
	echo "======================================="
	echo " FINAL TEST SUMMARY"
	echo "======================================="
	echo " Total suites: $total"
	echo " Passed:       $passed_count"
	echo " Failed:       $failed_count"
	echo "======================================="

	if [ ${#failed_names[@]} -gt 0 ]; then
		echo ""
		echo " Failed suites:"
		for i in "${!failed_names[@]}"; do
			echo "   ❌ ${failed_names[$i]}"
			echo "      Log: ${failed_logs[$i]}"
		done

		# Dump full logs for failed suites so stack traces are visible in CodeBuild/CloudWatch
		echo ""
		echo "======================================="
		echo " FAILED SUITE LOGS"
		echo "======================================="
		for i in "${!failed_names[@]}"; do
			echo ""
			echo "┌──────────────────────────────────────────────────────────"
			echo "│ FULL LOG: ${failed_names[$i]}"
			echo "├──────────────────────────────────────────────────────────"
			cat "${failed_logs[$i]}" 2>/dev/null | sed 's/^/│ /'
			echo "└──────────────────────────────────────────────────────────"
		done
	fi

	echo ""
	echo "======================================="
}

# Trap handler: kill all tracked background PIDs on SIGTERM/SIGINT
cleanup() {
	echo ""
	echo "Caught signal, killing background processes..."
	for pid in "${PIDS[@]}"; do
		kill "$pid" 2>/dev/null
	done
	exit 1
}

# Set trap only when running in parallel mode
if [ "$PARALLEL" = "true" ]; then
	trap cleanup SIGTERM SIGINT
fi

# ==============================================================================
# Note: Functions are inherited by subshells ( ... ) & naturally in bash.
# No export -f needed since we use direct subshells, not bash -c.
# ==============================================================================

# ==============================================================================
# Script Entry Point
# ==============================================================================

# switch to source directory to run the test
cd ../source

# Save the current working directory and set source directory
source_dir=$PWD
export source_dir
export CLEAN
export WORKERS_PER_SUITE
cd $source_dir
echo "---------------------------------------"
echo "source directory is $source_dir"
echo "---------------------------------------"

# Create log directory for parallel test output (clean on each run)
rm -rf "$source_dir/test/logs"
mkdir -p "$source_dir/test/logs"

# ==============================================================================
# Phase 1: Sequential Setup (set -e active — fail fast on dependency errors)
# ==============================================================================
# JS layer builds, Python layer installs, and UV installation must complete
# before any dependent test suites can run.

echo "======================================="
echo "Phase 1: Sequential Setup"
echo "======================================="

echo "---------------------------------------"
echo "Building JS layers"
echo "---------------------------------------"

cd $source_dir

# Build aws-node-user-agent-config layer
cd lambda/layers/aws-node-user-agent-config
timer npm ci
timer npm run build

cd $source_dir

# Build aws-sdk-lib layer
cd lambda/layers/aws-sdk-lib
timer npm ci
timer npm run build

cd $source_dir

echo "---------------------------------------"
echo "Installing Python layers"
echo "---------------------------------------"

timer install_lambda_layer layers/aws_boto3 "Boto3 SDK Layer"
timer install_lambda_layer layers/langchain "LangChain Layer"

echo "---------------------------------------"
echo "Installing UI dependencies (needed by CDK infrastructure tests)"
echo "---------------------------------------"

cd $source_dir/ui-deployment
timer npm ci
cd $source_dir

cd $source_dir/ui-chat
timer npm ci
cd $source_dir

echo "---------------------------------------"
echo "Verifying UV installation"
echo "---------------------------------------"

setup_uv

echo "======================================="
echo "Phase 1: Setup Complete"
echo "======================================="

# ==============================================================================
# Phase 2: Test Execution
# ==============================================================================

cd $source_dir

if [ "$PARALLEL" = "true" ]; then
	# ==========================================================================
	# PARALLEL MODE: Launch all independent test suites as background processes
	# ==========================================================================
	echo ""
	echo "======================================="
	echo "Phase 2: Parallel Test Execution (PARALLEL=true)"
	echo "======================================="
	echo ""

	# Disable set -e for parallel phase — we track exit codes manually
	set +e

	# Initialize throttle tracking variables (used by run_in_background when MAX_PARALLEL > 0)
	THROTTLE_COMPLETED=0
	THROTTLE_PASSED=0
	THROTTLE_ANY_FAILED=0
	THROTTLE_TOTAL=22

	# --- UI Projects ---
	run_in_background "ui-deployment" run_ui_project_test ui-deployment
	run_in_background "ui-chat" run_ui_project_test ui-chat

	# --- Python Layer Tests ---
	run_in_background "custom_boto3_init" run_python_lambda_test layers/custom_boto3_init "Python User Agent Config Lambda Layer"

	# --- JS Layer Tests ---
	run_in_background "aws-node-user-agent-config-layer" run_javascript_lambda_test layers/aws-node-user-agent-config "Typescript User Agent Config Layer"

	# --- Python Lambda Tests ---
	run_in_background "chat" run_python_lambda_test chat "Chat Use Case"
	run_in_background "invoke-agent" run_python_lambda_test invoke-agent "Bedrock Agent"
	run_in_background "agentcore-invocation" run_python_lambda_test agentcore-invocation "Agent Core Invocation"
	run_in_background "custom-resource" run_python_lambda_test custom-resource "Custom Resource"
	run_in_background "ext-idp-group-mapper" run_python_lambda_test ext-idp-group-mapper "IDP Group Mapper for Cognito JWT pre-token generation"

	# --- JavaScript Lambda Tests ---
	run_in_background "custom-authorizer" run_javascript_lambda_test custom-authorizer "Custom Authorizer"
	run_in_background "model-info" run_javascript_lambda_test model-info "Backing function for Model Info API"
	run_in_background "feedback-management" run_javascript_lambda_test feedback-management "Feedback Management Lambda"
	run_in_background "use-case-details" run_javascript_lambda_test use-case-details "Use Case Details Lambda"
	run_in_background "use-case-management" run_javascript_lambda_test use-case-management "Deployment Platform Use Case Management Lambda"
	run_in_background "files-management" run_javascript_lambda_test files-management "Files Management Lambda"
	run_in_background "files-metadata-management" run_javascript_lambda_test files-metadata-management "Files Metadata Management Lambda"
	run_in_background "websocket-connectors" run_javascript_lambda_test websocket-connectors "Websocket Connector Lambda"

	# --- Python Script Tests ---
	run_in_background "v2_migration" run_python_scripts_test v2_migration "Migration script for use cases to move from 1.x to 2.x and higher"

	# --- CDK Infrastructure Tests ---
	run_in_background "infrastructure" run_cdk_project_test "CDK - Generative AI Application Builder on AWS"

	# --- ECR Container Tests ---
	run_in_background "gaab-strands-agent" run_ecr_container_tests "gaab-strands-agent" "GAAB Strands Agent"
	run_in_background "gaab-strands-common" run_ecr_container_tests "gaab-strands-common" "GAAB Strands Common"
	run_in_background "gaab-strands-workflow-agent" run_ecr_container_tests "gaab-strands-workflow-agent" "GAAB Strands Workflow Agent"

	echo ""
	echo "All test suites launched. Waiting for results..."
	echo ""

	# ===========================================================================
	# Phase 3: Results Collection
	# ===========================================================================
	echo "======================================="
	echo "Phase 3: Collecting Results"
	echo "======================================="

	collect_results_progressive
	exit_code=$?

	cd $source_dir

	echo "---------------------------------------"
	echo "Executing Unit Tests Complete"
	echo "---------------------------------------"

	exit $exit_code

else
	# ==========================================================================
	# SEQUENTIAL MODE: Original behavior — run all suites one at a time
	# ==========================================================================
	echo ""
	echo "======================================="
	echo "Phase 2: Sequential Test Execution (PARALLEL=false)"
	echo "======================================="
	echo ""

	# The sequence of execution is important. The list has been sequenced to accommodate for any dependencies
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

	timer run_python_lambda_test layers/custom_boto3_init "Python User Agent Config Lambda Layer"
	timer run_javascript_lambda_test layers/aws-node-user-agent-config "Typescript User Agent Config Layer"

	echo "---------------------------------------"
	echo "Running unit test for lambda functions"
	echo "---------------------------------------"

timer run_python_lambda_test chat "Chat Use Case"
timer run_python_lambda_test invoke-agent "Bedrock Agent"
timer run_python_lambda_test agentcore-invocation "Agent Core Invocation"
timer run_javascript_lambda_test custom-authorizer "Custom Authorizer"
timer run_python_lambda_test custom-resource "Custom Resource"
timer run_python_lambda_test ext-idp-group-mapper "IDP Group Mapper for Cognito JWT pre-token generation"
timer run_javascript_lambda_test model-info "Backing function for Model Info API"
timer run_javascript_lambda_test feedback-management "Feedback Management Lambda"
timer run_javascript_lambda_test use-case-details "Use Case Details Lambda"
timer run_javascript_lambda_test use-case-management "Deployment Platform Use Case Management Lambda"
timer run_javascript_lambda_test files-management "Files Management Lambda"
timer run_javascript_lambda_test files-metadata-management "Files Metadata Management Lambda"
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

	# Run ECR container tests
	timer run_ecr_container_tests "gaab-strands-agent" "GAAB Strands Agent"
	timer run_ecr_container_tests "gaab-strands-common" "GAAB Strands Common"
	timer run_ecr_container_tests "gaab-strands-workflow-agent" "GAAB Strands Workflow Agent"

	cd $source_dir

	echo "---------------------------------------"
	echo "Executing Unit Tests Complete"
	echo "---------------------------------------"
fi
