// file: app/page.tsx
'use client';

import { useState } from 'react';
import { Shield, Swords } from 'lucide-react';
import ReplayUploader from './components/ReplayUploader';
import RandomBattleAnalyzer from './components/RandomBattleAnalyzer';

type Mode = 'abs' | 'random';

export default function Home() {
  const [mode, setMode] = useState<Mode>('abs');

  return (
    <div className="space-y-6">
      <div className="glass-panel p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Режим аналізу</p>
            <h1 className="text-base sm:text-lg font-semibold text-white">Оберіть тип боїв</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('abs')}
              aria-pressed={mode === 'abs'}
              className={`btn-ghost text-xs sm:text-sm font-medium ${mode === 'abs' ? 'border-white/50 bg-white/10 text-white' : ''}`}
            >
              <Shield className="h-4 w-4" />
              АБС
            </button>
            <button
              type="button"
              onClick={() => setMode('random')}
              aria-pressed={mode === 'random'}
              className={`btn-ghost text-xs sm:text-sm font-medium ${mode === 'random' ? 'border-white/50 bg-white/10 text-white' : ''}`}
            >
              <Swords className="h-4 w-4" />
              Випадкові бої
            </button>
          </div>
        </div>
      </div>

      {mode === 'abs' ? <ReplayUploader /> : <RandomBattleAnalyzer />}
    </div>
  );
}
