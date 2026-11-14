'use client';

/** Adapted from Navida's PublicNavbar; actual routes and an accessible mobile menu. */
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '../ui/Icon';
import { usePreferences } from '../../state/preferences';

const navigation = [
  { to: '/platform', label: 'Platform' }, { to: '/methodology', label: 'Methodology' },
  { to: '/data', label: 'Our data' }, { to: '/about', label: 'About' },
];

export function PublicNavbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = usePreferences();
  const [open, setOpen] = useState(false);
  const links = navigation.map(item => <Link href={item.to} key={item.to}
    aria-current={pathname === item.to ? 'page' : undefined} onClick={() => setOpen(false)}>{item.label}</Link>);
  return <header className="public-navbar"><Link href="/" aria-label="Iris home" className="public-brand">
    <span className="brand-mark"><Icon name="globe" size={24} /></span><strong>Iris<span className="brand-period">.</span></strong></Link>
    <nav className="public-links" aria-label="Product navigation">{links}</nav>
    <div className="public-actions"><button className="theme-toggle" onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
      <Link className="primary-button" href="/workspace">Open workspace <Icon name="arrow" size={15} /></Link>
      <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger className="public-menu secondary-button" aria-label="Open product navigation">☰</Dialog.Trigger>
        <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="public-menu-dialog" aria-describedby={undefined}>
          <Dialog.Title>Explore Iris</Dialog.Title><Dialog.Close className="dialog-close" aria-label="Close product navigation">×</Dialog.Close>
          <nav aria-label="Mobile product navigation">{links}</nav>
        </Dialog.Content></Dialog.Portal>
      </Dialog.Root>
    </div></header>;
}
