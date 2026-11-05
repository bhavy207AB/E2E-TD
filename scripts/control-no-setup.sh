#!/usr/bin/env bash
#
# TDV2-1138 control: the same four tests sharded the same way, but with NO
# shared setup test (playwright.nosetup.config.ts). No test id runs in more than
# one shard, so nothing is over-counted. Expected: Passed, before and after the
# fix (confirms sharded runs with no shared test are unchanged).
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck source=scripts/_env.sh
source "scripts/_env.sh"

CI_RUN_ID="${CI_RUN_ID:-tdv2-1138-nosetup-$(date +%Y%m%d-%H%M%S)}"
echo "ci-run-id: $CI_RUN_ID (2 shards, no shared setup)"
echo

echo "=== shard 1/2 ==="
npx tdpw test --config=playwright.nosetup.config.ts --ci-run-id "$CI_RUN_ID" --tags "tdv2-1138,control-no-setup" --shard=1/2
echo "=== shard 2/2 ==="
npx tdpw test --config=playwright.nosetup.config.ts --ci-run-id "$CI_RUN_ID" --tags "tdv2-1138,control-no-setup" --shard=2/2

echo
echo "Done. Open '$CI_RUN_ID' in TestDino ($APP_URL). Expected: Passed."
