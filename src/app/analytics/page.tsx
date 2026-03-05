import Link from 'next/link';
import { ArrowRight, BarChart3, Shield, Swords } from 'lucide-react';

const analyticsCards = [
  {
    title: 'АБС аналітика',
    description: 'Топ гравців на вибраній карті, карти з найкращим і найгіршим середнім уроном.',
    href: '/abs-replays',
    icon: Shield,
  },
  {
    title: 'Аналітика Random',
    description: 'Найкращий середній урон по картах, кращий winrate та рейтинг техніки на конкретній карті.',
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
            <h1 className="text-2xl font-semibold text-white">Центр аналітики</h1>
            <p className="mt-2 text-sm text-slate-300">
              Тут швидкий доступ до всіх аналітичних модулів. Завантажуйте реплеї у потрібному режимі і отримуйте
              деталізовану статистику по картах, гравцях і техніці.
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
              Перейти
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
