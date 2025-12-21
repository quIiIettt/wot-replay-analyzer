// file: app/components/ReplayUploader.tsx
'use client';

import { useState, useMemo } from 'react';
import { UploadCloud, Rocket, FileText, Loader2, XCircle, ArrowUpDown, Shield } from 'lucide-react';

type Battle = {
    map: string;
    tank: string;
    damage: number;
    kills: number;
    assisted_damage: number;
};
type PlayerStats = {
    battles: Battle[];
    total_damage: number;
    total_kills: number;
    total_assisted: number;
};
type MapStats = {
    wins: number;
    battles: number;
};
type AnalysisResults = {
    player_stats: Record<string, PlayerStats>;
    map_stats: Record<string, MapStats>;
};
type SortConfig = {
    key: string;
    direction: 'ascending' | 'descending';
};

function batchFilesBySize(
    files: File[],
    maxBatchBytes = 16 * 1024 * 1024, // ~16 MB
    maxFilesPerBatch = 25
): File[][] {
    const batches: File[][] = [];
    let cur: File[] = [];
    let curBytes = 0;

    for (const f of files) {
        const fitsBySize = curBytes + f.size <= maxBatchBytes;
        const fitsByCount = cur.length < maxFilesPerBatch;

        if (cur.length && (!fitsBySize || !fitsByCount)) {
            batches.push(cur);
            cur = [f];
            curBytes = f.size;
        } else {
            cur.push(f);
            curBytes += f.size;
        }
    }
    if (cur.length) batches.push(cur);
    return batches;
}

function mergeAnalysisResults(parts: AnalysisResults[]): AnalysisResults {
    const out: AnalysisResults = { player_stats: {}, map_stats: {} };

    for (const r of parts) {
        // merge player_stats
        for (const [name, ps] of Object.entries(r.player_stats)) {
            const dst = (out.player_stats[name] ??= {
                battles: [],
                total_damage: 0,
                total_kills: 0,
                total_assisted: 0,
            });
            dst.battles.push(...ps.battles);
            dst.total_damage += ps.total_damage;
            dst.total_kills += ps.total_kills;
            dst.total_assisted += ps.total_assisted;
        }

        // merge map_stats
        for (const [map, ms] of Object.entries(r.map_stats)) {
            const dst = (out.map_stats[map] ??= { wins: 0, battles: 0 });
            dst.wins += ms.wins;
            dst.battles += ms.battles;
        }
    }

    return out;
}


export default function ReplayUploader() {
    const [files, setFiles] = useState<File[]>([]);
    const [results, setResults] = useState<AnalysisResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'summary' | 'details'>('summary');
    const [minBattles, setMinBattles] = useState(1);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'avgDamage', direction: 'descending' });
    const fileInputId = 'replay-files';

    const getWinrateColor = (winrate: number): string => {
        if (winrate <= 46) return 'text-rose-300';
        if (winrate <= 52) return 'text-amber-300';
        if (winrate <= 57) return 'text-emerald-300';
        if (winrate <= 63) return 'text-cyan-300';
        return 'text-fuchsia-300';
    };
    const getAvgDamageColor = (damage: number): string => {
        if (damage <= 1400) return 'text-rose-300';
        if (damage <= 1601) return 'text-orange-300';
        if (damage <= 1901) return 'text-amber-300';
        if (damage <= 2301) return 'text-emerald-300';
        if (damage <= 2601) return 'text-cyan-300';
        return 'text-fuchsia-300';
    };
    const trimTankName = (fullName: string): string => {
        const parts = fullName.split('_');
        if (parts.length > 1) {
            return parts.slice(1).join('_');
        }
        return fullName;
    };


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextFiles = event.target.files ? Array.from(event.target.files) : [];
        if (nextFiles.length) {
            setFiles(nextFiles);
            setError(null);
        }
    };
    const handleAnalyze = async () => {
        if (files.length === 0) return;
        setIsLoading(true);
        setError(null);
        setResults(null);

        try {
            const batches = batchFilesBySize(files, 16 * 1024 * 1024, 25);
            const parts: AnalysisResults[] = [];

            for (const group of batches) {
                const fd = new FormData();
                group.forEach((file) => fd.append('replays', file, file.name));

                const res = await fetch('/api/analyze', { method: 'POST', body: fd });

                // важливо: читаємо як текст, потім пробуємо JSON
                const text = await res.text();
                let json: AnalysisResults;
                try {
                    json = JSON.parse(text) as AnalysisResults;
                } catch {
                    throw new Error(`Server status ${res.status}. Body (first 200): ${text.slice(0, 200)}`);
                }

                if (!json.player_stats || Object.keys(json.player_stats).length === 0) {
                    // не валимо весь процес — просто пропускаємо «порожній» батч
                    continue;
                }
                parts.push(json);
            }

            const merged = mergeAnalysisResults(parts);
            if (!merged.player_stats || Object.keys(merged.player_stats).length === 0) {
                throw new Error('Не вдалося обробити реплеї (усі батчі порожні).');
            }

            setResults(merged);
            setView('summary');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Невідома помилка');
        } finally {
            setIsLoading(false);
        }
    };


    const processedPlayerData = useMemo(() => {
        if (!results?.player_stats) return [];
        const playersWithAverages = Object.entries(results.player_stats).map(([name, stats]) => {
            const battleCount = stats.battles.length;
            return {
                name, stats, battleCount,
                avgDamage: battleCount > 0 ? stats.total_damage / battleCount : 0,
                avgKills: battleCount > 0 ? stats.total_kills / battleCount : 0,
                avgAssisted: battleCount > 0 ? stats.total_assisted / battleCount : 0,
            };
        });
        const filteredPlayers = playersWithAverages.filter(p => p.battleCount >= minBattles);
        const sortedPlayers = [...filteredPlayers].sort((a, b) => {
            const key = sortConfig.key as keyof typeof a;
            if (a[key] < b[key]) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (a[key] > b[key]) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortedPlayers;
    }, [results, minBattles, sortConfig]);

    const mapStatistics = useMemo(() => {
        if (!results?.map_stats) return [];
        return Object.entries(results.map_stats)
            .map(([mapName, stats]) => ({
                mapName,
                ...stats,
                winrate: stats.battles > 0 ? (stats.wins / stats.battles) * 100 : 0,
            }))
            .sort((a, b) => b.battles - a.battles);
    }, [results]);

    const handleSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'descending';
        if (sortConfig.key === key && sortConfig.direction === 'descending') direction = 'ascending';
        setSortConfig({ key, direction });
    };

    return (
        <div className="relative z-10 w-full max-w-5xl mx-auto space-y-6">
            <div className="glass-panel p-4 sm:p-5">
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-cyan-300" />
                    АБС — аналіз реплеїв
                </h2>
                <div className="flex flex-col lg:flex-row items-center gap-3">
                    <input
                        id={fileInputId}
                        type="file"
                        multiple
                        accept=".wotreplay,.WOTREPLAY"
                        onChange={handleFileChange}
                        onClick={(event) => {
                            event.currentTarget.value = '';
                        }}
                        className="sr-only"
                    />
                    <label htmlFor={fileInputId} className="btn-ghost w-full sm:w-auto text-xs sm:text-sm font-medium">
                        <UploadCloud className="w-4 h-4 mr-2" />
                        <span>Обрати файли</span>
                    </label>
                    <p className="text-slate-300 text-xs sm:text-sm flex-1">
                        {files.length > 0 ? `Обрано файлів: ${files.length}` : 'Будь ласка, оберіть .wotreplay файли'}
                    </p>
                    <button onClick={handleAnalyze} disabled={files.length === 0 || isLoading} className="btn-primary w-full sm:w-auto text-xs sm:text-sm font-semibold">
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
                        <span>{isLoading ? 'Аналіз...' : 'Почати аналіз'}</span>
                    </button>
                </div>
            </div>

            {error && ( <div className="glass-card border border-rose-400/30 bg-rose-500/10 p-4"><div className="flex items-center"><XCircle className="w-5 h-5 text-rose-300 mr-2"/><div><p className="font-semibold text-rose-200 text-sm">Помилка</p><p className="text-rose-100/80 text-sm">{error}</p></div></div></div> )}

            {results && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-1 glass-panel p-4">
                        <h2 className="text-base font-semibold text-white mb-3">Статистика по картах</h2>
                        <div className="table-shell overflow-x-auto overflow-y-visible">
                            <table className="w-full text-left text-xs sm:text-sm text-slate-200">
                                <thead className="table-head">
                                <tr>
                                    <th className="px-2.5 py-1.5 font-semibold">Карта</th>
                                    <th className="px-2.5 py-1.5 font-semibold text-center">Боїв</th>
                                    <th className="px-2.5 py-1.5 font-semibold text-center">WR %</th>
                                </tr>
                                </thead>
                                <tbody className="text-slate-200/90">
                                {mapStatistics.map((map) => (
                                    <tr key={map.mapName} className="table-row">
                                        <td className="px-2.5 py-1.5 font-medium">{map.mapName}</td>
                                        <td className="px-2.5 py-1.5 text-center">{map.battles}</td>
                                        <td className={`px-2.5 py-1.5 text-center font-bold ${getWinrateColor(map.winrate)}`}>
                                            {map.winrate.toFixed(1)}%
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="lg:col-span-2 glass-panel p-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3">
                            <h2 className="text-base font-semibold text-white">Статистика по гравцях</h2>
                            <div className='flex items-center gap-3 w-full sm:w-auto'>
                                <div className="flex items-center gap-2"><label htmlFor="min-battles" className="text-xs sm:text-sm text-slate-300">Мін. боїв:</label><input id="min-battles" type="number" value={minBattles} onChange={(e) => setMinBattles(Number(e.target.value) || 1)} className="w-14 rounded-md border border-white/20 bg-white/5 p-0.5 text-center text-xs sm:text-sm text-slate-100" min="1"/></div>
                                <button onClick={() => setView(view === 'summary' ? 'details' : 'summary')} className="btn-ghost w-full sm:w-auto text-xs sm:text-sm font-medium"><FileText className="w-4 h-4 mr-2" /><span>{view === 'summary' ? 'Детальний звіт' : 'Загальна статистика'}</span></button>
                            </div>
                        </div>

                        {view === 'summary' ? (
                            <div className="table-shell overflow-x-auto overflow-y-visible">
                                <table className="w-full text-left text-xs sm:text-sm text-slate-200">
                                    <thead className="table-head">
                                    <tr>
                                        <th className="px-2.5 py-1.5 font-semibold cursor-pointer hover:bg-white/10" onClick={() => handleSort('name')}><div className="flex items-center">Нікнейм гравця <ArrowUpDown className="w-3 h-3 ml-1" /></div></th>
                                        <th className="px-2.5 py-1.5 font-semibold text-center cursor-pointer hover:bg-white/10" onClick={() => handleSort('battleCount')}><div className="flex items-center justify-center">Боїв <ArrowUpDown className="w-3 h-3 ml-1" /></div></th>
                                        <th className="px-2.5 py-1.5 font-semibold text-center cursor-pointer hover:bg-white/10" onClick={() => handleSort('avgDamage')}><div className="flex items-center justify-center">Сер. урон <ArrowUpDown className="w-3 h-3 ml-1" /></div></th>
                                        <th className="px-2.5 py-1.5 font-semibold text-center cursor-pointer hover:bg-white/10" onClick={() => handleSort('avgKills')}><div className="flex items-center justify-center">Сер. кілли <ArrowUpDown className="w-3 h-3 ml-1" /></div></th>
                                        <th className="px-2.5 py-1.5 font-semibold text-center cursor-pointer hover:bg-white/10" onClick={() => handleSort('avgAssisted')}><div className="flex items-center justify-center">Сер. асист <ArrowUpDown className="w-3 h-3 ml-1" /></div></th>
                                    </tr>
                                    </thead>
                                    <tbody className="text-slate-200/90">
                                    {processedPlayerData.map((p) => ( <tr key={p.name} className="table-row"><td className="px-2.5 py-1.5 font-medium">{p.name}</td><td className="px-2.5 py-1.5 text-center">{p.battleCount}</td><td className={`px-2.5 py-1.5 text-center font-bold ${getAvgDamageColor(p.avgDamage)}`}>{p.avgDamage.toFixed(0)}</td><td className="px-2.5 py-1.5 text-center">{p.avgKills.toFixed(2)}</td><td className="px-2.5 py-1.5 text-center">{p.avgAssisted.toFixed(0)}</td></tr> ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {processedPlayerData.map((p) => (
                                    <div key={p.name}>
                                        <h3 className="text-sm font-semibold text-white mb-2">{p.name}</h3>
                                        <div className="table-shell overflow-x-auto overflow-y-visible">
                                            <table className="w-full text-left text-xs">
                                                <thead className="table-head"><tr><th className="px-2.5 py-1.5 font-semibold">Мапа</th><th className="px-2.5 py-1.5 font-semibold">Техніка</th><th className="px-2.5 py-1.5 font-semibold text-center">Урон</th><th className="px-2.5 py-1.5 font-semibold text-center">Кілли</th><th className="px-2.5 py-1.5 font-semibold text-center">Асист</th></tr></thead>
                                                <tbody className="text-slate-200/90">
                                                {p.stats.battles.map((b, index) => ( <tr key={index} className="table-row last:border-b-0"><td className="px-2.5 py-1.5">{b.map}</td><td className="px-2.5 py-1.5">{trimTankName(b.tank)}</td><td className="px-2.5 py-1.5 text-center font-medium">{b.damage}</td><td className="px-2.5 py-1.5 text-center">{b.kills}</td><td className="px-2.5 py-1.5 text-center">{b.assisted_damage}</td></tr> ))}
                                                </tbody>
                                                <tfoot><tr className="border-t border-white/15 bg-white/5 font-semibold"><td colSpan={2} className="px-2.5 py-1.5 text-right text-slate-300">СЕРЕДНІ ЗНАЧЕННЯ:</td><td className={`px-2.5 py-1.5 text-center ${getAvgDamageColor(p.avgDamage)}`}>{p.avgDamage.toFixed(0)}</td><td className="px-2.5 py-1.5 text-center">{p.avgKills.toFixed(2)}</td><td className="px-2.5 py-1.5 text-center">{p.avgAssisted.toFixed(0)}</td></tr></tfoot>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
