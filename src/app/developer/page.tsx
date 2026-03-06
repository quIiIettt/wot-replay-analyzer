import Link from 'next/link';
import { Code2, Database, Layers, Wrench } from 'lucide-react';

const stack = [
  { label: 'Frontend', value: 'Next.js 16 + React 19', icon: Layers },
  { label: 'Replay Parsing', value: 'Node.js API routes + TypeScript', icon: Database },
  { label: 'UI/UX', value: 'Tailwind CSS v4 + Lucide Icons', icon: Wrench },
] as const;

export default function DeveloperPage() {
  return (
    <div className="space-y-6">
      <section className="glass-panel p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
            <Code2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-white">Developer</h1>
            <p className="mt-2 text-sm text-slate-300">
              Technical project page with a quick stack overview and direct navigation to the main dashboard.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {stack.map(({ label, value, icon: Icon }) => (
          <article key={label} className="kpi-card">
            <Icon className="h-4 w-4" />
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
            <p className="mt-1 text-sm text-white">{value}</p>
          </article>
        ))}
      </section>

      <Link href="/" className="btn-linkish w-full sm:w-auto">
        Back to Home
      </Link>
    </div>
  );
}
