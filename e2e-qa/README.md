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
4. **Re-run failed jobs** in GitHub (or **Re-run** in TestDino) → `GITHUB_RUN_ATTEMPT` becomes 2 and
   `testdino-e2e run` runs **only** that job's previously-failed tests. The dashboard shows it as narrowed.

The `workflow_dispatch` inputs cover the TestDino-dispatched re-run (Latest / Another branch / custom picks).

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
| 1 | Branch on the run | ✓ local branch `main` recorded (run inside the git repo) |
| 2 | Missing-retry / flaky | ✓ run ends **Passed / Flaky**, not Incomplete |
| 7 | Test Controls decide exit | ✓ non-quarantined fail → exit 1; all-pass → exit 0; wrapper reads staging Test Controls. **Quarantine → exit 0 needs a quarantine rule on staging** (currently "0 rules") |
| 8 | Re-run failed only | ✓ `testdino-e2e rerun` narrows to the run's failed tests (+ required setup). **GitHub-narrowed retry end-to-end needs real CI** |
| 10 | Visual comparison | ✓ `toHaveScreenshot` comparison runs; a diff attaches expected/actual/diff |
| — | Plain `e2e run` unchanged | ✓ exit codes unchanged vs wrapper |

### Needs the staging dashboard or real CI (cannot be driven from the CLI here)

- Item 1 on **GitLab / Azure / Jenkins / CircleCI / Bitbucket / Buildkite / CodeBuild / Harness** real runners, and PR columns.
- Item 6 **stored selection** (`--selection <id>`) — the id comes from TestDino "Run automated tests".
- Item 7 **quarantine → exit 0** and **known-error** / **critical** rules — configure Test Controls on staging first.
- Item 8 **real GitHub Actions narrowed retry** from the Re-run button.
- Item 9 **device MP4** — needs a real Android/iOS device recording.
- Dashboard UI: the visual-comparison view, Re-run sheet, run-page settings.
