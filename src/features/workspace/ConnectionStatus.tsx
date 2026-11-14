'use client';

import { useEffect, useState } from 'react';
import { fetchHealth } from '../../data/health';

/** Liveness only. Scientific operations remain unavailable regardless of connection. */
export function ConnectionStatus() {
  const [connection, setConnection] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetchHealth(controller.signal).then(
      () => { if (!controller.signal.aborted) setConnection('connected'); },
      () => { if (!controller.signal.aborted) setConnection('error'); },
    );
    return () => controller.abort();
  }, [attempt]);
  return <div className="connection">
    <p role="status"><i className={`indicator ${connection}`} aria-hidden="true" />{
      connection === 'connected' ? 'Local server connected' : connection === 'error'
        ? 'Could not connect to the local server' : 'Connecting to the local server…'
    }</p>
    {connection === 'error' && <button className="text-button" onClick={() => {
      setConnection('connecting'); setAttempt(n => n + 1);
    }}>Retry connection</button>}
  </div>;
}
