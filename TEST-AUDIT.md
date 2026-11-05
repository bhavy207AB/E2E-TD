# Test Result Audit — TDV2-1138

**Ticket:** [TDV2-1138](https://testdino.atlassian.net/browse/TDV2-1138) — *[BE] A sharded run whose jobs share a setup test shows Incomplete with every test passed*
**Type:** Bug · Backend / ingestion completeness · Priority: Medium · Status: To Do
**Tested by:** Bhavyy · **Date:** 2026-11-05 · **Environment:** Production

## 1. Objective
Reproduce the reported defect: a sharded Playwright run that shares a `setup`
test is flagged **Incomplete** (1 missing) even though every test passed and no
result was lost.

## 2. Test environment
| | |
|---|---|
| Dashboard / ingestion | `app.testdino.com` / `reporter.testdino.com` (prod) |
| Project | `project_a710e3c5fb42c84696effe41` (org `org_698ac2249275ce6a2f0e430d`) |
| Reporter | `@testdino/playwright` 2.11.1 |
| Playwright / Node | `@playwright/test` 1.58.2 / Node v24.12.0 |
| App under test | `demo.playwright.dev/todomvc` (public, deterministic) |

## 3. Test design (mirrors ticket repro steps)
- `setup` project: **1 shared setup test** (seeds state, saves storage state).
- `chromium` project: **4 tests**, `dependencies: ['setup']`.
- Executed as **2 shards** (`--shard=1/2`, `--shard=2/2`) grouped under **one
  `--ci-run-id`** — two separate `tdpw test` processes, as in CI.
- Reporter injected by the `tdpw` CLI (per vendor README).

## 4. Execution log — primary reproduction
| Run ID | Shards | Per-shard result | Total | Publish |
|---|---|---|---|---|
| `test_run_f699448c4bfb6762cc775479` | 1/2, 2/2 | 3 passed + 3 passed | 6/6 passed | auth OK, run:begin/run:end delivered |
| `test_run_98dca4b544c56f8aa024292b` (retest) | 1/2, 2/2 | 3 passed + 3 passed | 6/6 passed | auth OK, run:begin/run:end delivered |

Pre-flight (local, no publish): `--list` → 1 setup + 4 tests; setup present in
**both** shards; full suite green 5/5; no-setup control green 4/4.

## 5. Control / acceptance-criteria runs
Run-level status read via the public API
(`GET https://api.testdino.com/api/v1/public/{projectId}/test-runs/{runId}`,
PAT-authenticated) on 2026-11-05.

| Scenario | Run ID | is_sharded | result (total/passed/unknown) | **Actual status** | Expected | Verdict |
|---|---|---|---|---|---|---|
| Sharded + shared setup (the bug) | `test_run_98dca4b544c56f8aa024292b` | true (2) | 6 / 5 / 1 | **incomplete** | Incomplete pre-fix | ✅ bug reproduced |
| Sharded + shared setup (repeat) | `test_run_f699448c4bfb6762cc775479` | true (2) | 6 / 5 / 1 | **incomplete** | Incomplete pre-fix | ✅ bug reproduced |
| Unsharded + shared setup | `test_run_bae68e5bdf0e8c51a266ea9a` | false | 5 / 5 / 0 | **passed** | Passed | ✅ correct |
| Sharded, no shared setup | `test_run_388965c4f2bbc06f073bbc1a` | true (2) | 4 / 4 / 0 | **passed** | Passed | ✅ correct |
| Sharded, real lost result | `test_run_f3e3dfb8d355995924edce19` | false | 3 / 3 / 0 | passed | Incomplete | ⚠️ invalid control (see note) |

Reconciliation detail for the repro run `test_run_98dca4b544c56f8aa024292b`:
```
status: incomplete
data_completeness:     { missing_tests: 1, missing_attempts: 0, tests: [] }   ← 1 missing, no test named
shard_reconciliation:  { reported_shards: 2, expected_shards: 2, missing_shard_indexes: [], reconciles: true }
```
**Both shards fully reported and reconcile, yet the run is flagged incomplete with
a phantom missing test** — the over-count described in the ticket (6 counted vs 5
stored rows, because the shared setup is summed once per shard but upserts to one row).

> **Note — lose-result control invalid as designed.** Omitting shard 2/2 entirely
> made the server finalize shard 1 as a non-sharded run (`is_sharded: false`,
> passed), so it did not exercise "a sharded run that truly lost a result."
> A valid negative control must have both shards report while one genuinely drops
> a result row; this still needs to be constructed for the fix-verification stage.

## 6. Findings
1. The repro condition is **reliably reproducible** — multiple consecutive clean
   publishes, each a single run / two shards / shared setup / all tests passing.
2. The shared setup test executes in **both** shards under one `pw_test_id` —
   exactly the over-count trigger described in the ticket.
3. **Expected defect (per ticket):** aggregated run = **Incomplete, 1 missing,
   no test named**; `total_tests` 6, 5 result rows, `missing_tests` 1
   (6 = 2×setup + 4; setup upserts to a single row → 5 stored).
4. Suspected root cause (as filed): `judgeCompleteness` in
   `services/ingestion/go/internal/processor/completeness.go` sums each shard's
   `executedTests`, counting the shared setup once per job.

## 7. Verification method
Run-level status read directly via the PAT-authenticated public API
(`GET /api/v1/public/{projectId}/test-runs/{runId}` on `api.testdino.com`).
The reporter's `td_api_` key cannot read runs by design (ingestion-scoped); a
`td_pat_` user PAT was used for the reads. All five reads returned HTTP 200.

## 8. Result — BUG CONFIRMED, STILL PRESENT ON PROD
A sharded run (2 shards) whose jobs share a setup test, with **every test
passing**, is marked **`incomplete`** with **1 phantom missing test and no test
named** — reproduced on two independent runs. Control runs confirm the defect is
isolated to exactly the ticket's condition:

- Sharded **+ shared setup** → `incomplete` (6/5/1) ❌ — the bug
- Unsharded + shared setup → `passed` (5/5/0) ✅
- Sharded, **no** shared setup → `passed` (4/4/0) ✅

The shard reconciliation itself reports `reconciles: true` (both shards present,
nothing lost), proving the Incomplete verdict is a false positive from the
completeness count, not real data loss — consistent with the filed root cause in
`judgeCompleteness` (`services/ingestion/go/internal/processor/completeness.go`).

**Verdict: NOT FIXED. The bug reproduces on production as of 2026-11-05.**
