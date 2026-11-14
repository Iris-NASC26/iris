"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { DOCS_URL } from "@/lib/docs";

const navigation = [
  { to: "/platform", label: "Platform" },
  { to: "/methodology", label: "Methodology" },
  { to: "/data", label: "Our data" },
  { to: "/case-studies", label: "Case studies" },
  { to: "/about", label: "About" },
];

export function PublicNavbar({
  dark,
  onToggleTheme,
}: {
  dark: boolean;
  onToggleTheme: () => void;
}) {
  const pathname = usePathname();
  const [mobileMenu, setMobileMenu] = useState(false);
  const closeMenu = () => setMobileMenu(false);

  return (
    <header className="landing-nav public-navbar">
      <Link aria-label="Iris home" className="brand brand-link" onClick={closeMenu} href="/">
        <span className="brand-mark">
          <Icon name="globe" size={23} />
          <i className="orbit-dot" />
        </span>
        <span className="brand-name">Iris</span>
      </Link>
      <nav
        aria-label="Product navigation"
        className={mobileMenu ? "landing-links open" : "landing-links"}
      >
        {navigation.map((item) => {
          const isActive = pathname === item.to || pathname?.startsWith(`${item.to}/`);
          return (
            <Link
              className={isActive ? "active" : ""}
              key={item.to}
              onClick={closeMenu}
              href={item.to}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="landing-nav-actions">
        <a
          aria-label="View documentation"
          className="landing-nav-icon"
          title="Documentation"
          href={DOCS_URL}
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="book" size={16} />
        </a>
        <a
          aria-label="View GitHub repository"
          className="landing-nav-icon"
          href="https://github.com/Iris-NASC26/iris"
          rel="noreferrer"
          target="_blank"
          title="GitHub repository"
        >
          <Icon name="github" size={16} />
        </a>
        <button
          aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
          className="theme-toggle"
          onClick={onToggleTheme}
          type="button"
        >
          <Icon name={dark ? "sun" : "moon"} size={17} />
        </button>
        <Link className="landing-login" href="/workspace">
          Open workspace
        </Link>
        <button
          aria-expanded={mobileMenu}
          aria-label="Toggle navigation"
          className="landing-menu-button"
          onClick={() => setMobileMenu((value) => !value)}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
