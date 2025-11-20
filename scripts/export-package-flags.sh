#!/usr/bin/env bash
# This script reads package.json scripts and exports flags for CI/CD or local use
# Usage: source ./export-package-flags.sh or bash ./export-package-flags.sh

set -e

if [ ! -f package.json ]; then
  echo "Error: package.json not found in current directory." >&2
  exit 1
fi

echo "Reading package.json scripts and exporting flags..."

has_lint=$(node -e "const s=require('./package.json').scripts||{};process.stdout.write(String(!!s.lint))")
has_test=$(node -e "const s=require('./package.json').scripts||{};process.stdout.write(String(!!s.test))")
has_build_full=$(node -e "const s=require('./package.json').scripts||{};process.stdout.write(String(!!s['build:full']))")
has_build_wasm=$(node -e "const s=require('./package.json').scripts||{};process.stdout.write(String(!!s['build:wasm']))")

# Export to GitHub Actions output if available
if [ -n "$GITHUB_OUTPUT" ]; then
  {
    echo "has_lint=$has_lint"
    echo "has_test=$has_test"
    echo "has_build_full=$has_build_full"
    echo "has_build_wasm=$has_build_wasm"
  } >> "$GITHUB_OUTPUT"
fi

# Also export as environment variables for local use
export HAS_LINT="$has_lint"
export HAS_TEST="$has_test"
export HAS_BUILD_FULL="$has_build_full"
export HAS_BUILD_WASM="$has_build_wasm"

echo "has_lint=$HAS_LINT"
echo "has_test=$HAS_TEST"
echo "has_build_full=$HAS_BUILD_FULL"
echo "has_build_wasm=$HAS_BUILD_WASM"
