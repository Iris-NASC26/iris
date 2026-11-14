/** Adapted from Navida's public PageShell. Shared with the Next.js public routes. */
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';
import { PublicNavbar } from './PublicNavbar';
import { ConnectionStatus } from '../../features/workspace/ConnectionStatus';

export function PublicFrame({ children }: { children: ReactNode }) {
  return <div className="app-shell public-site"><a href="#public-content" className="skip-link">Skip to content</a>
    <PublicNavbar /><div className="capability-banner"><span><Icon name="info" size={16} />Analysis unavailable · No observations loaded</span><ConnectionStatus /></div>
    <main className="public-content" id="public-content">{children}</main>
    <footer className="public-footer"><div><strong>Iris · Earth Trend Detective</strong><p>Curiosity, grounded in evidence.</p></div>
      <nav aria-label="Footer navigation"><Link href="/methodology">Methods</Link><Link href="/data">Data sources</Link><Link href="/about">Project</Link></nav>
      <span>Local practice build · SI off</span></footer>
  </div>;
}

export function PageShell({ children, section, title, description, action }: {
  children: ReactNode; section: string; title: string; description: string; action?: ReactNode;
}) {
  return <PublicFrame><section className="public-page-hero"><div><p className="eyebrow">IRIS / {section}</p><h1>{title}</h1><p>{description}</p></div>{action}</section>{children}</PublicFrame>;
}
