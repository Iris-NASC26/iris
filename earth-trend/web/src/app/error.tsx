'use client';

export default function ApplicationError({ reset }: { reset: () => void }) {
  return <main className="dashboard-page"><h1>The workspace could not load.</h1>
    <p>Retry this page. Scientific availability has not changed.</p>
    <button className="primary-button" onClick={reset}>Retry page</button></main>;
}
