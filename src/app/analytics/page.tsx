import Link from 'next/link';
import { ArrowRight, BarChart3, Shield, Swords } from 'lucide-react';

const analyticsCards = [
  {
    title: 'ABS Analytics',
    description: 'Top players per selected map, plus maps with the highest and lowest average damage.',
    href: '/abs-replays',
    icon: Shield,
  },
  {
    title: 'Random Analytics',
    description: 'Best average damage by map, strongest win rate, and vehicle rankings on specific maps.',
    href: '/random-battles',
    icon: Swords,
  },
] as const;

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <section className="glass-panel p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-white">Analytics Hub</h1>
            <p className="mt-2 text-sm text-slate-300">
              Quick access to all analysis modules. Upload replays in the mode you need and get detailed stats across
              maps, players, and vehicles.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {analyticsCards.map(({ title, description, href, icon: Icon }) => (
          <Link key={title} href={href} className="glass-panel group flex min-h-48 flex-col justify-between p-5">
            <div>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-700/45 text-slate-100">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-3 text-lg font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm text-slate-300">{description}</p>
            </div>
            <span className="mt-5 inline-flex items-center gap-2 text-sm text-white">
              Open
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
