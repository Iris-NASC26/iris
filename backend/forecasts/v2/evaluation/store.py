"""Versioned evaluation artifacts in an isolated experiment namespace.

Writes are atomic (temp file + rename), experiment IDs are content
derived, and existing artifacts are never overwritten — a repeated run
of the same spec gets a new run suffix.
"""
from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

from ...store import PATH as STORE_PATH

ROOT = Path(STORE_PATH).parent / "v2" / "evaluation"


def _write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(text)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def allocate(spec_fp: str, mode: str, root=None) -> Path:
    root = Path(root) if root else ROOT
    base = f"eval-{spec_fp[:12]}-{mode}"
    n, path = 1, root / f"{base}-r1"
    while path.exists():
        n += 1
        path = root / f"{base}-r{n}"
    return path


def save_run(path: Path, *, spec: dict, fingerprint: str, report: dict,
             cases: list, status: str) -> None:
    _write(path / "spec.json", json.dumps(spec, indent=2, default=str))
    _write(path / "report.json",
           json.dumps({**report, "spec_fingerprint": fingerprint,
                       "state": status}, indent=2, default=str))
    lines = "\n".join(json.dumps(c, default=str) for c in cases)
    _write(path / "predictions.jsonl", lines + ("\n" if lines else ""))
    _write(path / "report.md", markdown(report, fingerprint, status))


def markdown(report: dict, fingerprint: str, status: str) -> str:
    lines = [f"# Iris forecast evaluation `{fingerprint[:12]}`",
             "", f"- state: **{status}**", f"- protocol: {report.get('protocol_version')}",
             f"- assessment mode: {report.get('assessment_mode')}",
             f"- walk-forward folds completed: "
             f"{report.get('walk_forward_fold_count', 0)} of "
             f"{report.get('walk_forward_folds_planned', 0)}",
             f"- final holdout: {report.get('final_holdout', {}).get('status')}",
             ""]
    for ctx in report.get("contexts", []):
        lines.append(f"## {ctx['location_id']} · {ctx['dataset_id']} · {ctx['target']}")
        lines.append(f"spatial: {ctx.get('spatial_mode')} ({ctx.get('spatial_support')})")
        for grp in ctx.get("groups", []):
            lines.append(f"\n### {grp['group_by']} = {grp['group']} "
                         f"(n={grp.get('n')}, common={grp.get('common_n')})")
            for name, m in grp.get("methods", {}).items():
                lines.append(
                    f"- {name}: n={m.get('n')} mae={_fmt(m.get('mae'))} "
                    f"pinball={_fmt(m.get('pinball'))} "
                    f"coverage80={_fmt(m.get('coverage_80'))}")
        lines.append("")
    for note in report.get("notes", []):
        lines.append(f"> {note}")
    return "\n".join(lines) + "\n"


def _fmt(v):
    return "n/a" if v is None else f"{v:.4g}"
