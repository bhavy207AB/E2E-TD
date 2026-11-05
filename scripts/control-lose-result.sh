#!/usr/bin/env bash
#
# TDV2-1138 negative control: a sharded run that REALLY loses a result must
# still show Incomplete. We publish shard 1/2 only and never send shard 2/2
# under the same ci-run-id, so that shard's results genuinely never arrive.
# Expected: Incomplete — and it must STAY Incomplete after the fix (the fix
# must not paper over real data loss).
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck source=scripts/_env.sh
source "scripts/_env.sh"

CI_RUN_ID="${CI_RUN_ID:-tdv2-1138-loseresult-$(date +%Y%m%d-%H%M%S)}"
echo "ci-run-id: $CI_RUN_ID (shard 1/2 only — shard 2/2 intentionally omitted)"
echo

echo "=== shard 1/2 (only this one is reported) ==="
npx tdpw test --ci-run-id "$CI_RUN_ID" --tags "tdv2-1138,negative-lose-result" --shard=1/2

echo
echo "Done. Open '$CI_RUN_ID' in TestDino ($APP_URL)."
echo "Expected (before AND after fix): Incomplete — shard 2/2 results were truly lost."
