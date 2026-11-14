import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PreferencesProvider } from '../state/preferences';
import '../styles/base.css';

export const metadata: Metadata = {
  title: 'Iris · Earth Trend Detective',
  description: 'A local Earth-system investigation workspace with traceable NASA sources.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" data-theme="dark" suppressHydrationWarning><body>
    <PreferencesProvider>{children}</PreferencesProvider>
  </body></html>;
}
