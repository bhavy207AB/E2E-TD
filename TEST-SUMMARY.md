# Test Summary — TDV2-1138

**Ticket:** [TDV2-1138](https://testdino.atlassian.net/browse/TDV2-1138) — *[BE] A sharded run whose jobs share a setup test shows Incomplete with every test passed*
**Type:** Bug · Backend (ingestion completeness) · Priority Medium
**Objective:** Reproduce the false "Incomplete" status on a sharded run that shares a setup test.
**Date:** 2026-11-04
**Environment:** Production (`reporter.testdino.com` ingestion, `app.testdino.com` dashboard)
**Reporter:** `@testdino/playwright` 2.11.1 · `@playwright/test` 1.58.2 · Node v24.12.0

---

## 1. Scope

Reproduce, via a real published run, the condition described in the ticket:
a Playwright suite with a shared `setup` test, run across two shards under one
CI run id, where every test passes — and confirm whether the aggregated run is
wrongly flagged **Incomplete**.

## 2. Test design

| Item | Detail |
| --- | --- |
| App under test | `https://demo.playwright.dev/todomvc` (public, deterministic) |
| `setup` project | 1 setup test (`tests/auth.setup.ts`) — seeds TodoMVC state, saves storage state |
| `chromium` project | 4 tests, `dependencies: ['setup']` (view ×2, edit ×2) |
| Sharding | `--shard=1/2` and `--shard=2/2`, grouped by one `--ci-run-id` |
| Reporter | injected by `tdpw test` CLI (not in config, to avoid double-report) |

**Why this shape triggers the bug:** the setup test runs once per shard process
under a single `pw_test_id`. Its rows upsert into one row
(`ON CONFLICT (run_id, pw_test_id, retry, run_start_time)`), but
`judgeCompleteness` (`services/ingestion/go/internal/processor/completeness.go`)
sums each process's `executedTests` and counts the setup once per job.

```
Counted executions = setup×2 shards + 4 tests = 6
Stored result rows  = setup→1 (upsert) + 4 tests = 5
missing_tests       = 6 − 5 = 1   → run flagged Incomplete
```

## 3. Execution

| Run | ci-run-id | Shard | Tests | Result |
| --- | --- | --- | --- | --- |
| `test_run_f699448c4bfb6762cc775479` | `tdv2-1138-prod-20261104-163900` | 1/2 | setup + edit(add), edit(complete) | **3 passed** |
| `test_run_f699448c4bfb6762cc775479` | `tdv2-1138-prod-20261104-163900` | 2/2 | setup + view(list), view(counter) | **3 passed** |

- Reporter authenticated successfully; `run:begin` and `run:end` delivered for both shards.
- Both shards resolved to the **same run id** — one logical run, two jobs, shared setup. ✔
- Run link:
  `https://app.testdino.com/org_698ac2249275ce6a2f0e430d/projects/project_a710e3c5fb42c84696effe41/test-runs/test_run_f699448c4bfb6762cc775479`

### Pre-flight validation (local, no publish)

| Check | Result |
| --- | --- |
| `playwright test --list` | 1 setup + 4 tests ✔ |
| Shard 1/2 and 2/2 each contain the setup test | ✔ (the over-count condition) |
| Full suite green locally (all passed precondition) | 5/5 passed ✔ |
| No-setup control suite green | 4/4 passed ✔ |

## 4. Results

| Expectation | Observed | Status |
| --- | --- | --- |
| Suite publishes as one 2-shard run sharing a setup test | Yes — `test_run_f699448c4bfb6762cc775479` | ✅ |
| Every test passes (no real data loss) | 6/6 passed (3 per shard) | ✅ |
| **Aggregated run shows Incomplete, 1 missing (total 6 / 5 rows)** | Server-side status — **pending visual confirmation on the run page** | ⏳ |

> The per-shard CLI output prints `PASSED` because each shard delivers its own
> results correctly. The ticket's defect is the **run-level** completeness
> verdict computed after both shards merge, which must be read on the dashboard.
> Programmatic verification via the analytics API was not completed (blocked by
> credential-handling policy on the prod token).

## 5. Reproduction verdict

**Reproduced — publish confirmed; run-level status awaiting confirmation on the dashboard.**
The exact precondition from the ticket (2 shards, shared setup, all passed, one
run) was published to prod. The remaining step is to read the run's status field
on the dashboard; per the ticket it is expected to be **Incomplete, 1 missing,
no test named**.

## 6. Pending / follow-up

- [ ] Confirm the run-level status on the dashboard reads **Incomplete (1 missing)**.
- [ ] Run negative control `control:lose-result` → must stay **Incomplete** (real loss).
- [ ] Run controls `control:unsharded` and `control:no-setup` → must read **Passed**.
- [ ] e2e variant with `test.setup` + `--shard` → same behaviour (ticket acceptance).
- [ ] Note: both staging and the old prod token were expired; a fresh prod token was used for this run.

## 7. Acceptance-criteria coverage (from the ticket)

| Acceptance criterion | Covered by | State |
| --- | --- | --- |
| Sharded run sharing a setup test, all passed → **Passed** (after fix) | `npm run repro` | reproduced pre-fix |
| Sharded run that really lost a result → still **Incomplete** | `npm run control:lose-result` | script ready |
| Unsharded + sharded-no-shared-test unchanged | `control:unsharded`, `control:no-setup` | scripts ready |
| Playwright **and** e2e behave the same | repro mirrors to e2e `test.setup` | documented |
