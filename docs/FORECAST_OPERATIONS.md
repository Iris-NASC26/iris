# Forecast Operations Runbook (Phase 7)

All commands run from `backend/` with the venv Python. Everything is
single-host/SQLite + filesystem — that is the stated topology; leases
are safe for coordinated ticks on one host, not a distributed claim.

## Schedules

```bash
.\.venv\Scripts\python.exe -m forecasts.v2.operations schedule create \
  --db ops.sqlite3 --kind history_update \
  --binding '{"location_id":"colombo","dataset_id":"ds-..","target":"power_t2m"}' \
  --cadence 86400 --enabled
... schedule list|enable --id sch-X|disable --id sch-X|pause|resume \
  --db ops.sqlite3
... schedule due --db ops.sqlite3        # inspect due work (no dispatch)
... schedule tick --db ops.sqlite3       # claim + plan due work
... schedule recover --db ops.sqlite3    # clear expired leases
```

- Kinds: `history_update`, `forecast_reissue`, `candidate_retrain`,
  `monitoring`. Disabled by default; pause/resume applies fleet-wide.
- UTC timestamps; cadence + `next_due` semantics documented in code.
- Missed runs coalesce to ONE catch-up; lease claim is atomic so a
  second tick/process cannot duplicate or steal live work. At-least-once
  attempts, idempotent effects — no exactly-once claim.

## Releases: validate / promote / rollback

```bash
... release list --root <opsroot> --ctx '{"location_id":"c","target":"t"}'
... release validate --root <opsroot> --ctx '{...}' --manifest rel.json
... release promote --root <opsroot> --ctx '{...}' --manifest rel.json \
  --expected rel-r1        # CAS — conflicts leave last valid active
... release rollback --root <opsroot> --ctx '{...}'
... release audit --root <opsroot> --ctx '{...}'
```

- `qualified` releases must carry evaluation + calibration evidence;
  holdout-consumed evidence can never qualify.
- Promotion is manual (`actor` recorded); no auto-promotion path exists.
- Rollback restores the previous coherent bundle without refitting;
  input compatibility must be revalidated separately by the caller.

## Generation, reopen, status, integrity

```bash
... generate --root <opsroot> --manifest rel.json --case case.json \
  [--issue ISO]    # adapter loads frozen candidate; calibration applies
                   # exactly once; raw vs adjusted kept distinct
... reopen --root <opsroot> --run-id run-XXX   # saved snapshot only —
                   # no refit, no provider access, no recalibration
... status --root <opsroot> --ctx '{...}'
... integrity --root <opsroot>               # read-only broken-ref scan
... score --runs preds.jsonl --obs obs.jsonl # matured-outcome scoring
```

## Monitoring semantics

- Skill only vs matured, usable, exactly-matched truth (window + source
  + context + support). Pending rows are pending — never scored on
  issue time or self-predictions.
- Truth revisions emit `revised_score` audit events; originals persist.
- Drift = σ-shift of input columns vs a frozen permitted reference,
  consecutive-breach debounce (default 3) — a warning, never proof of
  forecast failure; sparse evidence → `insufficient_evidence`.

## Limits / diagnosis

- Retrain triggers still obey bounded eval policy; nothing auto-promotes.
- Final-holdout scoring stays a separate explicit invocation.
- To diagnose stale input: check `status` latest_usable vs stored, job
  queue state, then `schedule tick`/`recover` — never blind retraining.
