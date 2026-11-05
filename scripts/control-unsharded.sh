#!/usr/bin/env bash
#
# TDV2-1138 control: the same suite WITH the shared setup, but NOT sharded.
# The setup test runs once, so stored rows match the target. Expected: Passed,
# both before and after the fix (confirms the fix doesn't change this path).
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck source=scripts/_env.sh
source "scripts/_env.sh"

CI_RUN_ID="${CI_RUN_ID:-tdv2-1138-unsharded-$(date +%Y%m%d-%H%M%S)}"
echo "ci-run-id: $CI_RUN_ID (single process, no --shard)"
echo

npx tdpw test --ci-run-id "$CI_RUN_ID" --tags "tdv2-1138,control-unsharded"

echo
echo "Done. Open '$CI_RUN_ID' in TestDino ($APP_URL). Expected: Passed."
