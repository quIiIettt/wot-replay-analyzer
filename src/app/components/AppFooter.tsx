import Link from 'next/link';
import { LifeBuoy, Radar } from 'lucide-react';

export default function AppFooter() {
  return (
    <footer className="site-footer relative z-20 border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10">
            <Radar className="h-4 w-4" />
          </span>
          <div className="text-xs text-slate-300">
            <p className="font-semibold text-white">WOT Replay Analyzer</p>
            <p>Розробив: coyc</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2 text-xs">
          <Link href="/" className="btn-linkish !px-3 !py-1.5">
            На головну
          </Link>
          <Link href="/analytics" className="btn-linkish !px-3 !py-1.5">
            Аналітика
          </Link>
          <a
            href="https://discord.com"
            target="_blank"
            rel="noreferrer"
            className="btn-linkish !px-3 !py-1.5"
          >
            <LifeBuoy className="h-3.5 w-3.5" />
            Сапорт Discord
          </a>
        </nav>
      </div>
    </footer>
  );
}
