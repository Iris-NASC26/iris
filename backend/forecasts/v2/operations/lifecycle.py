"""Scheduler lifecycle — a bounded background tick that only runs when
IRIS_OPS_ENABLED=1. Module import does nothing; page loads never tick.
Single-host topology: lease claims make duplicate ticks harmless, and
the stated deployment is one app process or coordinated ticks on one
host."""
from __future__ import annotations

import os
import threading
import uuid

from ..jobs import DB_PATH
from . import runner, schedules

OWNER = f"proc-{uuid.uuid4().hex[:8]}"
_stop = threading.Event()
_thread: threading.Thread | None = None


def tick_once() -> list:
    """One due-work planning pass — recover expired leases, then claim
    and plan. Bounded by the due list; never schedules new work."""
    schedules.recover_expired(DB_PATH)
    return runner.plan_due(DB_PATH, owner=OWNER)


def enabled() -> bool:
    return os.environ.get("IRIS_OPS_ENABLED") == "1"


def start() -> bool:
    global _thread
    if _thread is not None or not enabled():
        return False
    interval = int(os.environ.get("IRIS_OPS_TICK_SECONDS", "300"))
    _stop.clear()

    def _loop():
        while not _stop.wait(interval):
            try:
                tick_once()
            except Exception:  # a bad tick must not kill the loop
                pass

    _thread = threading.Thread(target=_loop, daemon=True,
                               name="iris-ops-scheduler")
    _thread.start()
    return True


def stop() -> None:
    global _thread
    _stop.set()
    t = _thread
    _thread = None
    if t is not None:
        t.join(timeout=5)
