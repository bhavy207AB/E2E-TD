# Sourced by the repro/control scripts. Resolves the TestDino token + ingestion
# URL that the `tdpw` CLI reads, based on TEST_ENV (stg|prod) and .env.
# Not meant to be run on its own.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# An explicit `TEST_ENV=... npm run ...` must win over the value in .env, so
# capture it before sourcing the file (which would otherwise overwrite it).
_TEST_ENV_OVERRIDE="${TEST_ENV:-}"

set -a
# shellcheck disable=SC1091
[ -f "$ROOT/.env" ] && . "$ROOT/.env"
set +a

TEST_ENV="${_TEST_ENV_OVERRIDE:-${TEST_ENV:-stg}}"

case "$TEST_ENV" in
  stg)
    export TESTDINO_TOKEN="${STG_TESTDINO_TOKEN:?set STG_TESTDINO_TOKEN in .env}"
    export TESTDINO_SERVER_URL="${STG_SERVER_URL:-https://stg-reporter.testdino.com}"
    APP_URL="${STG_APP_URL:-https://lab.testdino.com}"
    ;;
  prod)
    export TESTDINO_TOKEN="${PROD_TESTDINO_TOKEN:?set PROD_TESTDINO_TOKEN in .env}"
    export TESTDINO_SERVER_URL="${PROD_SERVER_URL:-https://reporter.testdino.com}"
    APP_URL="${PROD_APP_URL:-https://app.testdino.com}"
    ;;
  *)
    echo "Unknown TEST_ENV=$TEST_ENV (expected stg or prod)" >&2
    exit 1
    ;;
esac

echo "TEST_ENV=$TEST_ENV  ->  reporting to $TESTDINO_SERVER_URL  (view at $APP_URL)"
