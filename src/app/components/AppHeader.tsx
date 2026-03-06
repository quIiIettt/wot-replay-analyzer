'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LineChart, MessageCircle, Radar } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: Home, comingSoon: false },
  { href: '/analytics', label: 'Analytics', icon: LineChart, comingSoon: true },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname.startsWith(href);
}

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header relative z-20 border-b backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ring/40 bg-primary/15">
            <Radar className="h-4 w-4 text-primary" />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300">WoT Replay Analyzer</p>
            <p className="text-sm font-semibold text-white">Command Center</p>
          </div>
        </Link>

        <nav className="flex flex-wrap gap-2">
          {navItems.map(({ href, label, icon: Icon, comingSoon }) => {
            if (comingSoon) {
              return (
                <span key={href} className="nav-btn nav-btn-disabled" aria-disabled="true">
                  <Icon className="h-4 w-4" />
                  {label}
                  <span className="nav-btn-badge">в розробці</span>
                </span>
              );
            }

            return (
              <Link key={href} href={href} className={`nav-btn ${isActive(pathname, href) ? 'active' : ''}`}>
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}

          <a
            href="https://discord.com/users/360701932739756035"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-btn nav-btn-discord"
          >
            <MessageCircle className="h-4 w-4" />
            Discord: <strong className="font-semibold text-white">bbbbuubble</strong>
          </a>
        </nav>
      </div>
    </header>
  );
}
