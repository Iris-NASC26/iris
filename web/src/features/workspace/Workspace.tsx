/** Port of Navida's workspace frame/navigation; no Next.js or scientific state retained. */
import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon, type IconName } from '../../components/ui/Icon';
import { readPreference, usePreferences, writePreference } from '../../state/preferences';
import { ConnectionStatus } from './ConnectionStatus';
import { OnboardingTour } from './OnboardingTour';

const navigation: { label: string; items: { to: string; text: string; icon: IconName }[] }[] = [
  { label: 'Investigate', items: [
    { to: '/workspace', text: 'Overview', icon: 'globe' },
    { to: '/workspace/data-selection', text: 'Data selection', icon: 'box' },
    { to: '/workspace/data-preview', text: 'Data preview', icon: 'layers' },
    { to: '/workspace/visualize', text: 'Plot & visualize', icon: 'activity' },
  ] },
  { label: 'Earth system', items: [
    { to: '/workspace/globe', text: 'Living Globe', icon: 'globe' },
    { to: '/workspace/case-board', text: 'Regional Case Board', icon: 'layers' },
  ] },
  { label: 'Understand', items: [{ to: '/workspace/evidence', text: 'Evidence & methods', icon: 'book' }] },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { theme, toggleTheme } = usePreferences();
  return <>
    <Link to="/workspace" className="dashboard-brand" onClick={onNavigate}>
      <span className="brand-mark"><Icon name="globe" size={25} /><i /></span>
      <span><strong>Iris<span className="brand-period">.</span></strong><small>Earth Trend Detective</small></span>
    </Link>
    <nav aria-label="Workspace navigation" className="dashboard-nav">{navigation.map(group =>
      <div className="dashboard-nav-group" key={group.label}><p>{group.label}</p>{group.items.map(item =>
        <NavLink end={item.to === '/workspace'} to={item.to} key={item.to} onClick={onNavigate} title={item.text}>
          <Icon name={item.icon} size={19} /><span>{item.text}</span>
        </NavLink>)}
      </div>)}
    </nav>
    <div className="sidebar-bottom"><p className="sidebar-caption">Curiosity, grounded in evidence.</p>
      <OnboardingTour />
      <button className="sidebar-tool" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} /><span>{theme === 'dark' ? 'Light' : 'Dark'} mode</span>
      </button>
      <div className="local-label"><i className="indicator connected" />Local workspace</div>
    </div>
  </>;
}

export function Workspace() {
  const { level, setLevel, reducedMotion, setReducedMotion } = usePreferences();
  const [collapsed, setCollapsed] = useState(() => readPreference('sidebar-collapsed') === 'true');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const content = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);
  useEffect(() => { writePreference('sidebar-collapsed', String(collapsed)); }, [collapsed]);
  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      content.current?.focus();
      previousPath.current = location.pathname;
    }
  }, [location.pathname]);
  return <div className={`app-shell dashboard-shell${collapsed ? ' sidebar-collapsed' : ''}`}>
    <a className="skip-link" href="#workspace-content">Skip to content</a>
    <aside className="dashboard-sidebar"><Sidebar />
      <button className="collapse-button" onClick={() => setCollapsed(value => !value)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><Icon name="chevron" /></button>
    </aside>
    <div className="dashboard-content">
      <header className="dashboard-topbar">
        <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
          <Dialog.Trigger className="mobile-menu secondary-button" aria-label="Open workspace navigation">☰</Dialog.Trigger>
          <Dialog.Portal><Dialog.Overlay className="dialog-overlay" />
            <Dialog.Content className="mobile-drawer" aria-describedby={undefined}>
              <Dialog.Title className="sr-only">Workspace navigation</Dialog.Title>
              <Dialog.Close className="dialog-close" aria-label="Close workspace navigation">×</Dialog.Close>
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        <div className="topbar-identity"><span>NASA SPACE APPS · PRACTICE BUILD</span><strong>Earth System Trend Detective</strong></div>
        <div className="view-controls"><label>Explanation level<select value={level} onChange={event => setLevel(event.target.value as typeof level)}>
          <option value="explorer">Explorer</option><option value="student">Student</option><option value="scientist">Scientist</option>
        </select></label><label className="motion-control"><input type="checkbox" checked={reducedMotion}
          onChange={event => setReducedMotion(event.target.checked)} />Reduce motion</label></div>
      </header>
      <div className="capability-banner"><span><Icon name="info" size={16} />Analysis unavailable · No observations loaded</span><ConnectionStatus /></div>
      <main id="workspace-content" ref={content} tabIndex={-1} className="dashboard-page"><Outlet /></main>
      <footer className="workspace-footer"><span>Statistics decide. Every result needs a source.</span><span>Local · SI off</span></footer>
    </div>
  </div>;
}
