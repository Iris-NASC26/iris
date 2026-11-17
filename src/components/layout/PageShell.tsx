"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { useTheme } from "@/context/ThemeContext";

export type ShellProps = {
  children: ReactNode;
  section: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageShell({ children, section, title, description, action }: ShellProps) {
  const { dark, toggleTheme } = useTheme();

  return (
    <div className={dark ? "dark app-shell content-site" : "app-shell content-site"}>
      <PublicNavbar dark={dark} onToggleTheme={toggleTheme} />
      <main className="content-main">
        <section className="page-hero">
          <div className="page-hero-copy">
            <div className="section-kicker">
              <span>Iris</span> {section}
            </div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {action && <div className="page-hero-action">{action}</div>}
        </section>
        {children}
      </main>
      <footer className="site-footer">
        <div className="footer-brand">
          <div className="brand-mark">
            <Icon name="globe" size={19} />
          </div>
          <div>
            <strong>Iris</strong>
            <span>Open tools for a changing planet.</span>
          </div>
        </div>
        <div className="footer-links">
          <Link href="/methodology">Methods</Link>
          <Link href="/data">Data sources</Link>
          <Link href="/about">Project &amp; Team</Link>
          <a href="mailto:info@projectiris.earth">Contact us</a>
        </div>
        <span className="footer-note">Built with public Earth observation data</span>
      </footer>
    </div>
  );
}
