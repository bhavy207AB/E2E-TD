#!/usr/bin/env bash
#
# TDV2-1138 — the failing case.
#
# Two shards of one logical run, sharing a single setup test, grouped under one
# CI run id. Every test passes, yet the run is expected to show Incomplete with
# 1 unnamed missing test (total_tests 6, 5 result rows) until the backend fix
# lands.
#
# Each `tdpw test` invocation is a separate process, exactly like two CI jobs.
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck source=scripts/_env.sh
source "scripts/_env.sh"

CI_RUN_ID="${CI_RUN_ID:-tdv2-1138-repro-$(date +%Y%m%d-%H%M%S)}"
echo "Grouping both shards under ci-run-id: $CI_RUN_ID"
echo

echo "=== shard 1/2 ==="
npx tdpw test --ci-run-id "$CI_RUN_ID" --tags "tdv2-1138,shared-setup" --shard=1/2

echo "=== shard 2/2 ==="
npx tdpw test --ci-run-id "$CI_RUN_ID" --tags "tdv2-1138,shared-setup" --shard=2/2

echo
echo "Done. Open the run '$CI_RUN_ID' in TestDino ($APP_URL)."
echo "Expected (pre-fix): Incomplete, 1 missing, no test named."
echo "Expected (post-fix): Passed."
