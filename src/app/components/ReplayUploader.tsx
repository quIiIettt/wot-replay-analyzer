// file: app/components/ReplayUploader.tsx
'use client';

import { useState, useMemo } from 'react';
import { UploadCloud, Rocket, FileText, Loader2, XCircle, ArrowUpDown } from 'lucide-react';

// --- Типи даних ---
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


export default function ReplayUploader() {
    const [files, setFiles] = useState<File[]>([]);
    const [results, setResults] = useState<AnalysisResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'summary' | 'details'>('summary');
    const [minBattles, setMinBattles] = useState(1);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'avgDamage', direction: 'descending' });

    // --- ДОПОМІЖНІ ФУНКЦІЇ ПЕРЕМІЩЕНО ВСЕРЕДИНУ КОМПОНЕНТА ---
    const getWinrateColor = (winrate: number): string => {
        if (winrate <= 46) return 'text-red-500';
        if (winrate <= 52) return 'text-yellow-500';
        if (winrate <= 57) return 'text-green-500';
        if (winrate <= 63) return 'text-cyan-400';
        return 'text-purple-500';
    };
    const getAvgDamageColor = (damage: number): string => {
        if (damage <= 1400) return 'text-red-500';
        if (damage <= 1601) return 'text-orange-500';
        if (damage <= 1901) return 'text-yellow-500';
        if (damage <= 2301) return 'text-green-500';
        if (damage <= 2601) return 'text-cyan-400';
        return 'text-purple-500';
    };
    const trimTankName = (fullName: string): string => {
        const parts = fullName.split('_');
        if (parts.length > 1) {
            return parts.slice(1).join('_');
        }
        return fullName;
    };


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFiles(Array.from(event.target.files));
            setError(null);
        }
    };
    const handleAnalyze = async () => {
        if (files.length === 0) return;
        setIsLoading(true);
        setError(null);
        setResults(null);
        const formData = new FormData();
        files.forEach((file) => formData.append('replays', file));
        try {
            const response = await fetch('/api/analyze', { method: 'POST', body: formData });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Помилка аналізу');
            }
            const data: AnalysisResults = await response.json();
            if (!data.player_stats || Object.keys(data.player_stats).length === 0) {
                throw new Error("Не вдалося обробити реплеї.");
            }
            setResults(data);
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
        <div className="w-full max-w-7xl mx-auto space-y-6 mt-6">
            <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">1. Завантаження реплеїв</h2>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <label className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                        <UploadCloud className="w-4 h-4 mr-2" />
                        <span>Обрати файли</span>
                        <input type="file" multiple accept=".wotreplay" onChange={handleFileChange} className="hidden" />
                    </label>
                    <p className="text-gray-500 text-sm flex-grow">
                        {files.length > 0 ? `Обрано файлів: ${files.length}` : 'Будь ласка, оберіть .wotreplay файли'}
                    </p>
                    <button onClick={handleAnalyze} disabled={files.length === 0 || isLoading} className="flex items-center justify-center w-full sm:w-auto px-5 py-2 bg-slate-900 text-white text-sm font-semibold rounded-md disabled:bg-slate-400 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors">
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
                        <span>{isLoading ? 'Аналіз...' : 'Почати аналіз'}</span>
                    </button>
                </div>
            </div>

            {error && ( <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-md"><div className="flex items-center"><XCircle className="w-5 h-5 text-red-600 mr-2"/><div><p className="font-semibold text-red-800 text-sm">Помилка</p><p className="text-red-700 text-sm">{error}</p></div></div></div> )}

            {results && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Статистика по картах</h2>
                        <div className="overflow-y-auto max-h-[600px]">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-100 text-gray-600 uppercase text-xs sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 font-semibold">Карта</th>
                                    <th className="px-3 py-2 font-semibold text-center">Боїв</th>
                                    <th className="px-3 py-2 font-semibold text-center">WR %</th>
                                </tr>
                                </thead>
                                <tbody className="text-gray-700">
                                {mapStatistics.map((map) => (
                                    <tr key={map.mapName} className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium">{map.mapName}</td>
                                        <td className="px-3 py-2 text-center">{map.battles}</td>
                                        <td className={`px-3 py-2 text-center font-bold ${getWinrateColor(map.winrate)}`}>
                                            {map.winrate.toFixed(1)}%
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                            <h2 className="text-lg font-semibold text-gray-800">Статистика по гравцях</h2>
                            <div className='flex items-center gap-4 w-full sm:w-auto'>
                                <div className="flex items-center gap-2"><label htmlFor="min-battles" className="text-sm text-gray-600">Мін. боїв:</label><input id="min-battles" type="number" value={minBattles} onChange={(e) => setMinBattles(Number(e.target.value) || 1)} className="w-16 p-1 border border-gray-300 rounded-md text-sm text-center" min="1"/></div>
                                <button onClick={() => setView(view === 'summary' ? 'details' : 'summary')} className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors w-full sm:w-auto justify-center"><FileText className="w-4 h-4 mr-2" /><span>{view === 'summary' ? 'Детальний звіт' : 'Загальна статистика'}</span></button>
                            </div>
                        </div>

                        {view === 'summary' ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                                    <tr>
                                        <th className="px-3 py-2 font-semibold cursor-pointer hover:bg-gray-200" onClick={() => handleSort('name')}><div className="flex items-center">Нікнейм гравця <ArrowUpDown className="w-3 h-3 ml-1" /></div></th>
                                        <th className="px-3 py-2 font-semibold text-center cursor-pointer hover:bg-gray-200" onClick={() => handleSort('battleCount')}><div className="flex items-center justify-center">Боїв <ArrowUpDown className="w-3 h-3 ml-1" /></div></th>
                                        <th className="px-3 py-2 font-semibold text-center cursor-pointer hover:bg-gray-200" onClick={() => handleSort('avgDamage')}><div className="flex items-center justify-center">Сер. урон <ArrowUpDown className="w-3 h-3 ml-1" /></div></th>
                                        <th className="px-3 py-2 font-semibold text-center cursor-pointer hover:bg-gray-200" onClick={() => handleSort('avgKills')}><div className="flex items-center justify-center">Сер. кілли <ArrowUpDown className="w-3 h-3 ml-1" /></div></th>
                                        <th className="px-3 py-2 font-semibold text-center cursor-pointer hover:bg-gray-200" onClick={() => handleSort('avgAssisted')}><div className="flex items-center justify-center">Сер. асист <ArrowUpDown className="w-3 h-3 ml-1" /></div></th>
                                    </tr>
                                    </thead>
                                    <tbody className="text-gray-700">
                                    {processedPlayerData.map((p) => ( <tr key={p.name} className="border-b border-gray-200 hover:bg-gray-50"><td className="px-3 py-2 font-medium">{p.name}</td><td className="px-3 py-2 text-center">{p.battleCount}</td><td className={`px-3 py-2 text-center font-bold ${getAvgDamageColor(p.avgDamage)}`}>{p.avgDamage.toFixed(0)}</td><td className="px-3 py-2 text-center">{p.avgKills.toFixed(2)}</td><td className="px-3 py-2 text-center">{p.avgAssisted.toFixed(0)}</td></tr> ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="mt-6 space-y-4 max-h-[550px] overflow-y-auto pr-2">
                                {processedPlayerData.map((p) => (
                                    <div key={p.name}>
                                        <h3 className="text-base font-semibold text-gray-800 mb-2">{p.name}</h3>
                                        <div className="overflow-x-auto border border-gray-200 rounded-md">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-gray-100 text-gray-600"><tr><th className="px-3 py-2 font-semibold">Мапа</th><th className="px-3 py-2 font-semibold">Техніка</th><th className="px-3 py-2 font-semibold text-center">Урон</th><th className="px-3 py-2 font-semibold text-center">Кілли</th><th className="px-3 py-2 font-semibold text-center">Асист</th></tr></thead>
                                                <tbody className="text-gray-700">
                                                {p.stats.battles.map((b, index) => ( <tr key={index} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50"><td className="px-3 py-2">{b.map}</td><td className="px-3 py-2">{trimTankName(b.tank)}</td><td className="px-3 py-2 text-center font-medium">{b.damage}</td><td className="px-3 py-2 text-center">{b.kills}</td><td className="px-3 py-2 text-center">{b.assisted_damage}</td></tr> ))}
                                                </tbody>
                                                <tfoot><tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold"><td colSpan={2} className="px-3 py-2 text-right text-gray-600">СЕРЕДНІ ЗНАЧЕННЯ:</td><td className={`px-3 py-2 text-center ${getAvgDamageColor(p.avgDamage)}`}>{p.avgDamage.toFixed(0)}</td><td className="px-3 py-2 text-center">{p.avgKills.toFixed(2)}</td><td className="px-3 py-2 text-center">{p.avgAssisted.toFixed(0)}</td></tr></tfoot>
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