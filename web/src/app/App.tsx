import { useEffect, useState } from 'react';
import { fetchHealth } from '../data/health';

type Connection = 'connecting' | 'connected' | 'error';

export function App() {
  const [connection, setConnection] = useState<Connection>('connecting');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetchHealth(controller.signal).then(
      () => { if (!controller.signal.aborted) setConnection('connected'); },
      () => { if (!controller.signal.aborted) setConnection('error'); },
    );
    return () => controller.abort();
  }, [attempt]);

  const message = {
    connecting: 'Connecting to the local server…',
    connected: 'Local server connected',
    error: 'Could not connect to the local server',
  }[connection];

  return (
    <main>
      <header><span className="mark" aria-hidden="true">◉</span> EARTH TREND DETECTIVE</header>
      <section aria-labelledby="title">
        <p className="eyebrow">PRACTICE BUILD · F02</p>
        <h1 id="title">A foundation for<br /><span>Earth’s evidence.</span></h1>
        <p className="intro">The local workspace is taking shape. Scientific analysis will become available as validated data and methods are integrated.</p>
        <div className="status-card">
          <p role="status" aria-live="polite"><span className={`indicator ${connection}`} aria-hidden="true" />{message}</p>
          {connection === 'error' && <>
            <p>Check that the backend is running on port 8000, then try again.</p>
            <button onClick={() => { setConnection('connecting'); setAttempt(n => n + 1); }}>Retry connection</button>
          </>}
          <p className="muted">Analysis unavailable · No observations loaded</p>
        </div>
      </section>
      <footer>Local runtime foundation · React + FastAPI</footer>
    </main>
  );
}
