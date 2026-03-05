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
              Головний дашборд
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Оберіть режим аналізу реплеїв
            </h1>
            <p className="text-sm text-slate-300 sm:text-base">
              Два окремі модулі: аналіз АБС-команди та аналіз випадкових боїв. Кожен модуль має власну статистику і
              розширену аналітику по картах.
            </p>
          </div>
          <Link href="/analytics" className="btn-linkish w-full sm:w-auto">
            Перейти до центру аналітики
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
            <span className="tag">АБС</span>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                <Shield className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-semibold text-white">АБС реплеї</h2>
            </div>
            <p className="text-sm text-slate-300">
              Порівняння гравців команди, winrate по картах, топ гравців на вибраній карті та метрики ефективності.
            </p>
          </div>
          <span className="mt-4 inline-flex items-center gap-2 text-sm text-white">
            Відкрити модуль
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
              <h2 className="text-xl font-semibold text-white">Випадкові бої</h2>
            </div>
            <p className="text-sm text-slate-300">
              Аналіз техніки та карт: де найкращий середній урон, де кращий winrate і які танки найсильніші на певній
              карті.
            </p>
          </div>
          <span className="mt-4 inline-flex items-center gap-2 text-sm text-white">
            Відкрити модуль
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </section>
    </div>
  );
}
