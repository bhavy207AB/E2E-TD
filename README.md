# TDV2-1138 — Reproduction

**Bug:** A sharded run whose jobs share a setup test is marked **Incomplete**
with 1 unnamed missing test, even though every test passed and no result was
lost. ([TDV2-1138](https://testdino.atlassian.net/browse/TDV2-1138))

## Why it happens

A Playwright `setup` project (or `test.setup` in e2e) runs **once per shard
process**. The setup test executes in every job under one `pw_test_id`, so its
rows upsert into a single row
(`ON CONFLICT (run_id, pw_test_id, retry, run_start_time)`). But
`judgeCompleteness` (`services/ingestion/go/internal/processor/completeness.go`)
sums each process's `executedTests`, counting the setup once per job. The target
comes out one higher than the stored rows, so the run is flagged Incomplete.

With 1 setup test + 4 dependent tests across 2 shards:

| Quantity | Value |
| --- | --- |
| Executions counted (setup ×2 jobs + 4 tests) | **6** |
| Stored result rows (setup upserts to 1) | **5** |
| `missing_tests` | **1** → Incomplete |

## Suite shape

- `tests/auth.setup.ts` — the **single shared setup test** (seeds TodoMVC state,
  saves `.auth/state.json`). Lives in the `setup` project.
- `tests/todos-view.spec.ts`, `tests/todos-edit.spec.ts` — **4 tests** in the
  `chromium` project, which `dependencies: ['setup']`.

Target app is `https://demo.playwright.dev/todomvc` — public and deterministic,
so every test passes reliably (required for the bug to surface as a false
Incomplete). The TestDino reporter is **not** in `playwright.config.ts`: the
`tdpw` CLI injects it, so adding it to the config would double-report.

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env   # already filled with stg + prod tokens in this checkout
```

`.env` selects the reporting target via `TEST_ENV` (`stg` by default, per the
ticket's verification plan). Tokens/URLs resolve in `scripts/_env.sh`.

## Run

| Command | Scenario | Expected (pre-fix) | Expected (post-fix) |
| --- | --- | --- | --- |
| `npm run repro` | 2 shards, **shared setup**, one ci-run-id | **Incomplete**, 1 missing | **Passed** |
| `npm run control:unsharded` | shared setup, **no shards** | Passed | Passed |
| `npm run control:no-setup` | 2 shards, **no shared setup** | Passed | Passed |
| `npm run control:lose-result` | 2 shards, **shard 2 never reported** | Incomplete | **Incomplete** (unchanged) |

Each script prints a `ci-run-id`; open that run in TestDino
(staging UI: <https://lab.testdino.com>) to read the status. Override the group
id with `CI_RUN_ID=... npm run repro`, or the target with `TEST_ENV=prod`.

The two shards in `repro` run as two separate `tdpw test` processes sharing one
`--ci-run-id`, exactly like two CI jobs:

```bash
npx tdpw test --ci-run-id "$CI_RUN_ID" --shard=1/2
npx tdpw test --ci-run-id "$CI_RUN_ID" --shard=2/2
```

## Acceptance criteria mapping

- Sharded run sharing a setup test, all passed → **Passed** → `npm run repro`
- Sharded run that really lost a result → still **Incomplete** →
  `npm run control:lose-result`
- Unsharded / no-shared-test runs unchanged → `control:unsharded`,
  `control:no-setup`
- e2e (`test.setup`) behaves the same → mirror the `repro` command in the e2e
  repo with `test.setup` + `--shard`.

## Validate wiring without publishing

```bash
npx playwright test --list                                   # setup + 4 tests
npx playwright test --config=playwright.nosetup.config.ts --list   # 4 tests
```
