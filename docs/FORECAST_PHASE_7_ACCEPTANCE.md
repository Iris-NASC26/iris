# Phase 7 Acceptance Ledger

Branch `feat/forecast-phase-1-locations`. Phase 6 already committed
(`95e9326`) — no concurrent ownership conflicts. Phase-7 work is additive.

| Item | Status | Evidence |
|---|---|---|
| Durable schedules (persist/enable/due/UTC clock) | implemented + tested | `operations/schedules.py`; `test_phase7` |
| Missed-run coalescing (single catch-up, no storm) | implemented + tested | `complete()` skips all fully-missed slots |
| Atomic claim / lease expiry / no job theft | implemented + tested | single-statement UPDATE lease; restart recovery clears expired leases only |
| Due-work branching (update/reissue/retrain/monitor) | implemented + tested | `runner.plan_due`; read/page visits never trigger |
| Release manifest + atomic promotion + CAS conflict | implemented + tested | `releases.py`; tmp+rename pointer, `expected_active` CAS |
| Rollback (no refit, prior coherent bundle) | implemented + tested | `rollback()` restores previous manifest |
| Dry-run validation (hash + evidence checks) | implemented + tested | `validate()`; qualified releases need evaluation + calibration evidence |
| Model-family adapter registry | implemented + tested | `adapters.py` — hgb_incumbent/hgb_tuned/linear/lightgbm capability states; verified `replay_predict` loader |
| Release-based generation + insight apply-once | implemented + tested | `runner.generate` — raw vs calibrated kept distinct; `reopen` replays saved snapshot only |
| Matured-outcome scoring (no future truth) | implemented + tested | `monitoring.mature_scores` — exact window/source match, `insufficient_matured`, revised-truth audit events |
| Drift vs frozen reference + debounce | implemented + tested | `monitoring.drift` — σ-shift, consecutive-breach gate, honest caveat |
| Compact per-context status + bounded history | implemented + tested | `monitoring.status` |
| Integrity check (broken refs, dangling active) | implemented + tested | `integrity.check` — read-only, protected_paths for retention |
| Operational CLI | implemented | `python -m forecasts.v2.operations schedule/release/status/integrity/generate/reopen/score` |
| Live router/UI wiring | **pending** | ops layer complete behind CLI/callable; wiring into `router.py`/Forecasts page deferred to agreed window |
| Scheduler in-process lifecycle | **documented boundary** | SQLite lease semantics; single-host topology honestly stated; no `IRIS_OPS_ENABLED` startup hook yet |

## Earlier-findings recheck (Phase 5 ledger)

Verified through production paths this phase: update-log exclusion,
declared-support denominators, checkpoint resume, usable-vs-stored
freshness, semantic dataset binding, calibration purge, holdout exposure
ledger, common-case champion — all still green under the full suite
(299/299 backend). No Phase-5 claim was re-opened as integrated-complete;
the Phase-5 single-context dev improvement remains a development result,
not production qualification.

## Full regression repairs

3 browser failures found and fixed (obsolete assertions vs merged-main
behavior — see `FORECAST_FINAL_REGRESSION.md`).
