// file: app/components/ReplayUploader.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
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
type AnalysisResults = Record<string, PlayerStats>;
type SortConfig = {
    key: string;
    direction: 'ascending' | 'descending';
};

// --- ОНОВЛЕНА ФУНКЦІЯ: Обрізає префікс у назві танка ---
const trimTankName = (fullName: string): string => {
    const underscoreIndex = fullName.indexOf('_');

    // Якщо підкреслення немає, нічого не робимо
    if (underscoreIndex === -1) {
        return fullName;
    }

    const prefix = fullName.substring(0, underscoreIndex);

    // Перевіряємо, чи префікс відповідає шаблону (напр. A69, Pl21, R157)
    // Шаблон: 1-2 літери на початку, за якими йдуть 2-3 цифри.
    if (prefix.match(/^[A-Za-z]{1,2}\d{2,3}$/)) {
        return fullName.substring(underscoreIndex + 1);
    }

    // Якщо префікс не схожий на технічний, повертаємо повне ім'я
    return fullName;
};


const getTankClass = (tankName: string): { name: string; color: string } => {
    const htKeywords = ['IS-', 'ИС-', 'KV-', 'КВ-', 'T110E5', 'E 100', 'Maus', 'Type 5 Heavy', 'WZ-111', 'BZ-75', 'S. Conqueror'];
    const mtKeywords = ['T-62A', 'Obj. 140', 'E 50', 'Leopard 1', 'M48 Patton', 'Bat.-Châtillon 25', 'STB-1', 'UDES 15/16'];
    const ltKeywords = ['T-100 LT', 'AMX 13 105', 'Rhm. Pzw.', 'Manticore'];
    const tdKeywords = ['Grille 15', 'Strv 103B', 'T110E3', 'T110E4', 'Obj. 268', 'Jagdpanzer E 100'];
    if (htKeywords.some(k => tankName.includes(k))) return { name: 'ВТ', color: 'text-red-500' };
    if (mtKeywords.some(k => tankName.includes(k))) return { name: 'СТ', color: 'text-green-600' };
    if (ltKeywords.some(k => tankName.includes(k))) return { name: 'ЛТ', color: 'text-yellow-600' };
    if (tdKeywords.some(k => tankName.includes(k))) return { name: 'ПТ', color: 'text-blue-500' };
    return { name: 'Інше', color: 'text-gray-500' };
};


export default function ReplayUploader() {
    const [files, setFiles] = useState<File[]>([]);
    const [results, setResults] = useState<AnalysisResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'summary' | 'details'>('summary');
    const [minBattles, setMinBattles] = useState(1);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'avgDamage', direction: 'descending' });

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
            if (Object.keys(data).length === 0) {
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

    const processedData = useMemo(() => {
        if (!results) return [];
        const playersWithAverages = Object.entries(results).map(([name, stats]) => {
            const battleCount = stats.battles.length;
            return {
                name,
                stats,
                battleCount,
                avgDamage: battleCount > 0 ? stats.total_damage / battleCount : 0,
                avgKills: battleCount > 0 ? stats.total_kills / battleCount : 0,
                avgAssisted: battleCount > 0 ? stats.total_assisted / battleCount : 0,
            };
        });
        const filteredPlayers = playersWithAverages.filter(p => p.battleCount >= minBattles);
        const sortedPlayers = [...filteredPlayers].sort((a, b) => {
            const key = sortConfig.key as keyof typeof a;
            if (a[key] < b[key]) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (a[key] > b[key]) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
        return sortedPlayers;
    }, [results, minBattles, sortConfig]);

    const handleSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'descending';
        if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'ascending';
        }
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
                    <button
                        onClick={handleAnalyze}
                        disabled={files.length === 0 || isLoading}
                        className="flex items-center justify-center w-full sm:w-auto px-5 py-2 bg-slate-900 text-white text-sm font-semibold rounded-md disabled:bg-slate-400 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
                        <span>{isLoading ? 'Аналіз...' : 'Почати аналіз'}</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-md">
                    <div className="flex items-center">
                        <XCircle className="w-5 h-5 text-red-600 mr-2"/>
                        <div>
                            <p className="font-semibold text-red-800 text-sm">Помилка</p>
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {results && (
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h2 className="text-lg font-semibold text-gray-800">2. Результати аналізу</h2>
                        <div className='flex items-center gap-4 w-full sm:w-auto'>
                            <div className="flex items-center gap-2">
                                <label htmlFor="min-battles" className="text-sm text-gray-600">Мін. боїв:</label>
                                <input
                                    id="min-battles"
                                    type="number"
                                    value={minBattles}
                                    onChange={(e) => setMinBattles(Number(e.target.value) || 1)}
                                    className="w-16 p-1 border border-gray-300 rounded-md text-sm text-center"
                                    min="1"
                                />
                            </div>
                            <button
                                onClick={() => setView(view === 'summary' ? 'details' : 'summary')}
                                className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors w-full sm:w-auto justify-center"
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                <span>{view === 'summary' ? 'Детальний звіт' : 'Загальна статистика'}</span>
                            </button>
                        </div>
                    </div>

                    {view === 'summary' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                                <tr>
                                    <th className="px-3 py-2 font-semibold cursor-pointer hover:bg-gray-200" onClick={() => handleSort('name')}>
                                        <div className="flex items-center">Нікнейм гравця <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                                    </th>
                                    <th className="px-3 py-2 font-semibold text-center cursor-pointer hover:bg-gray-200" onClick={() => handleSort('battleCount')}>
                                        <div className="flex items-center justify-center">Боїв <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                                    </th>
                                    <th className="px-3 py-2 font-semibold text-center cursor-pointer hover:bg-gray-200" onClick={() => handleSort('avgDamage')}>
                                        <div className="flex items-center justify-center">Сер. урон <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                                    </th>
                                    <th className="px-3 py-2 font-semibold text-center cursor-pointer hover:bg-gray-200" onClick={() => handleSort('avgKills')}>
                                        <div className="flex items-center justify-center">Сер. кілли <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                                    </th>
                                    <th className="px-3 py-2 font-semibold text-center cursor-pointer hover:bg-gray-200" onClick={() => handleSort('avgAssisted')}>
                                        <div className="flex items-center justify-center">Сер. асист <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="text-gray-700">
                                {processedData.map((p) => (
                                    <tr key={p.name} className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium">{p.name}</td>
                                        <td className="px-3 py-2 text-center">{p.battleCount}</td>
                                        <td className="px-3 py-2 text-center font-semibold">{p.avgDamage.toFixed(0)}</td>
                                        <td className="px-3 py-2 text-center">{p.avgKills.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-center">{p.avgAssisted.toFixed(0)}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="mt-6 space-y-4">
                            {processedData.map((p) => (
                                <div key={p.name}>
                                    <h3 className="text-base font-semibold text-gray-800 mb-2">{p.name}</h3>
                                    <div className="overflow-x-auto border border-gray-200 rounded-md">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-100 text-gray-600">
                                            <tr>
                                                <th className="px-3 py-2 font-semibold">Мапа</th>
                                                <th className="px-3 py-2 font-semibold">Техніка</th>
                                                <th className="px-3 py-2 font-semibold text-center">Урон</th>
                                                <th className="px-3 py-2 font-semibold text-center">Кілли</th>
                                                <th className="px-3 py-2 font-semibold text-center">Асист</th>
                                            </tr>
                                            </thead>
                                            <tbody className="text-gray-700">
                                            {p.stats.battles.map((b, index) => (
                                                <tr key={index} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                                                    <td className="px-3 py-2">{b.map}</td>
                                                    <td className="px-3 py-2">{trimTankName(b.tank)}</td>
                                                    <td className="px-3 py-2 text-center font-medium">{b.damage}</td>
                                                    <td className="px-3 py-2 text-center">{b.kills}</td>
                                                    <td className="px-3 py-2 text-center">{b.assisted_damage}</td>
                                                </tr>
                                            ))}
                                            </tbody>
                                            <tfoot>
                                            <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                                                <td colSpan={2} className="px-3 py-2 text-right text-gray-600">СЕРЕДНІ ЗНАЧЕННЯ:</td>
                                                <td className="px-3 py-2 text-center">{p.avgDamage.toFixed(0)}</td>
                                                <td className="px-3 py-2 text-center">{p.avgKills.toFixed(2)}</td>
                                                <td className="px-3 py-2 text-center">{p.avgAssisted.toFixed(0)}</td>
                                            </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}