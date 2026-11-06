# TDV2-1133 — e2e reporter QA harness

Real [`e2e` framework (TesterArmy)](https://github.com/tester-army/e2e) project that reports to
TestDino **staging** via the attached `@testdino/e2e@1.1.0-rerun` pack. Used to QA
[TDV2-1133](https://testdino.atlassian.net/browse/TDV2-1133) ("Bring e2e test runs to parity with Playwright").

## Layout

- `app/server.mjs` — a real, dependency-free web app under test: cookie auth, a login form, a dashboard
  with a stable summary card, and an interactive todo list (semantic HTML so role/label locators resolve).
- `e2e.config.ts` — two real targets (`desktop-chromium`, `mobile-webkit`) sharing one app the runner
  launches; `['list', testdino(...)]` reporters pointed at staging; `retries: 1`; trace + video on failure.
- `tests/`
  - `auth.setup.e2e.ts` — signs in once, saves the `admin` session.
  - `dashboard.e2e.ts` — restores the session; `summary card` uses `toHaveScreenshot` (item 10).
  - `todos.e2e.ts` — real add / complete / empty-submit interactions.
  - `flaky.e2e.ts` — fails attempt 1, passes on retry → Passed/Flaky (item 2).
  - `failing.e2e.ts` — a real deterministic failure, tagged `failing` (for exit-code / re-run checks).
- `tests/*-snapshots/` — committed screenshot baselines (per target + OS).
- `.env` — `TESTDINO_TOKEN`, `TESTDINO_SERVER_URL=https://stg-reporter.testdino.com`, app credentials.

## Setup

```bash
npm install                                  # e2e, @e2e-dev/web, the local @testdino/e2e pack
npx playwright install chromium webkit       # browser binaries for playwright-core 1.64.1
```

## Run

```bash
export E2E_TELEMETRY_DISABLED=1
npx e2e run                                   # full suite, both targets, uploads to staging
npx e2e run -u --grep "summary card"          # (re)write screenshot baselines
npx -p @testdino/e2e testdino-e2e run -- --tag todos          # wrapper: Test Controls decide exit code
npx -p @testdino/e2e testdino-e2e rerun --from-run <id> --scope failed   # re-run only a run's failures
```

## Item 8 in real GitHub CI

Workflow: `.github/workflows/e2e-item8.yml` (at the repo root, where GitHub reads it; it runs in `e2e-qa/`).

To activate:
1. Push `e2e-qa/`, `.github/`, and `testdino-e2e-1.1.0-rerun.tgz` to the GitHub repo.
2. Repo **Settings → Secrets and variables → Actions**: add secret `TESTDINO_TOKEN` (the staging token).
   Optionally add variable `TESTDINO_SERVER_URL` (defaults to `https://stg-reporter.testdino.com`).
3. Push to any branch → the job runs the suite; the `failing` test fails (exit 1).
4. Re-run. Two paths:
   - **Started from TestDino** (Re-run button → `workflow_dispatch` with `testdino_rerun_from`) → the `test`
     job runs `testdino-e2e rerun --from-run … --scope failed`, which runs **only the failed tests**.
   - **Raw GitHub "Re-run failed jobs"** (not started from TestDino) → runs **in full** on purpose, printing
     `TestDino re-run: running this job in full (this retry was not started from TestDino)`.

The `workflow_dispatch` inputs cover the TestDino-dispatched re-run (Latest / Another branch / custom picks).

The workflow has two jobs:
- `test` — single unsharded job (paths above).
- `test-sharded` — a 2-shard matrix; all shards share `TESTDINO_CI_RUN_ID` so TestDino merges them into
  one run, and on a TestDino-started native re-run each shard narrows to **only its own shard's** failures
  (skipped for a dispatched `--from-run` re-run, since a selection can't run in a shard).

### Verified on real GitHub CI (2026-11-05)
- **Branch** on the run, **flaky** (2), **sharded merge** (Shard 1 + Shard 2 → one run) — ✓
- **Quarantine → build exit 0** on CI (sharded jobs succeeded; log: "every failure is quarantined… exit 0") — ✓
- **Narrowed re-run** (TestDino-dispatched): ran **4 of 16** tests (2 failed + 2 setup deps), recorded as a
  `rerun` (`test_run_bfe38c32…`) — ✓
- **Safe default**: a raw GitHub re-run ran **in full** with the "not started from TestDino" message — ✓
- **Pending**: per-shard native narrowing via the dashboard **Re-run** button (needs TestDino↔GitHub integration).

## Verify a run from the API (staging)

The read API lives on `stg-api.testdino.com` (the MCP package hardcodes prod `api.testdino.com`).

```bash
BASE=https://stg-api.testdino.com; PROJ=project_b1b00dca9480ba7047cba842
H="Authorization: Bearer $TESTDINO_PAT"
curl -s -H "$H" "$BASE/api/mcp/hello"                                           # validate PAT, list orgs/projects
curl -s -H "$H" "$BASE/api/mcp/$PROJ/get-run-details?testrun_id=<runId>"        # counts, status, git branch
curl -s -H "$H" "$BASE/api/mcp/$PROJ/list-testcase?by_testrun_id=<runId>&by_status=flaky"
```

## Acceptance-criteria coverage

| Item | What | Status here |
| --- | --- | --- |
| 1 | Branch + PR on the run | ✓ branch recorded (local `main`; CI `e2e-qa-item8`); **PR column verified on CI** — PR #1 number/title/link/target captured (`test_run_ced835f8…`) |
| 2 | Missing-retry / flaky | ✓ run ends **Passed / Flaky**, not Incomplete |
| 4 | "Started by the author" | ✓ reporter logic: GitLab matches starter↔commit email (true→only trigger / false→"· name"); GitHub **PR uses the PR head commit, not the merge commit** (`resolveActorIsAuthor` + `collectGit`). UI rendering of the row/hover is the dashboard's |
| 5 | Update notice / debug / offline | ✓ older-installed prints the notice (newer/equal/prerelease: none); `TESTDINO_DEBUG=1` shows `testdino:` lines (off: none); offline update check never delays (settles in 150 ms grace) or fails the run |
| 7 | Test Controls decide exit | ✓ **all verified:** quarantined-only failure → exit 0 (run still Failed); **known-error → exit 0**; **critical passed-on-retry → exit 1**; non-quarantined failure → exit 1 (selective); mixed → exit 1; config error → exit 2 (never remapped); plain `e2e run` unchanged (exit 1) |
| 8 | Re-run failed only | ✓ **fully verified on real GitHub CI:** dispatched re-run ran 4 of 16 (failed+setup); raw GitHub re-run runs in full (safe default); native re-run fires from the dashboard Re-run button; **per-shard native narrowing** — each shard re-ran only its own 2 failures (9→3), log `attempt 2 runs the 2 test(s) this job failed before` |
| 10 | Visual comparison | ✓ `toHaveScreenshot` comparison runs; a diff attaches expected/actual/diff |
| — | Plain `e2e run` unchanged | ✓ exit codes unchanged vs wrapper |

### Needs the staging dashboard or real CI (cannot be driven from the CLI here)

- Item 6 **stored selection** (`--selection <id>`) — the id comes from TestDino "Run automated tests".
- Item 9 **device MP4** — needs a real Android/iOS device recording.
- Dashboard UI: the visual-comparison view, Re-run sheet, run-page settings, started-by-author row.
