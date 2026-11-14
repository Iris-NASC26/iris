import Link from 'next/link';

export default function NotFound() {
  return <main className="dashboard-page"><h1>Page not found</h1>
    <p>This address does not identify a workspace page or a saved result.</p>
    <Link href="/workspace" className="primary-button">Return to workspace</Link></main>;
}
