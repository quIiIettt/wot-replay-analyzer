import Link from 'next/link';
import { ArrowRight, Shield, Swords, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="glass-panel p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <span className="tag">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Main Dashboard
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Choose your replay analysis mode
            </h1>
            <p className="text-sm text-slate-300 sm:text-base">
              Two dedicated modules: ABS team replay analysis and random battle analysis. Each module includes its own
              stats and detailed map insights.
            </p>
          </div>
          <Link href="/analytics" className="btn-linkish w-full sm:w-auto">
            Open Analytics Hub
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Link
          href="/abs-replays"
          className="glass-panel group flex min-h-56 flex-col justify-between p-5 transition hover:translate-y-[-2px]"
        >
          <div className="space-y-3">
            <span className="tag">ABS</span>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                <Shield className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-semibold text-white">ABS Replays</h2>
            </div>
            <p className="text-sm text-slate-300">
              Compare team player performance, map win rate, top players on each map, and core efficiency metrics.
            </p>
          </div>
          <span className="mt-4 inline-flex items-center gap-2 text-sm text-white">
            Open Module
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>

        <Link
          href="/random-battles"
          className="glass-panel group flex min-h-56 flex-col justify-between p-5 transition hover:translate-y-[-2px]"
        >
          <div className="space-y-3">
            <span className="tag">Random</span>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                <Swords className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-semibold text-white">Random Battles</h2>
            </div>
            <p className="text-sm text-slate-300">
              Analyze vehicles and maps to find the best average damage, strongest win rate, and top tanks per map.
            </p>
          </div>
          <span className="mt-4 inline-flex items-center gap-2 text-sm text-white">
            Open Module
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </section>
    </div>
  );
}
