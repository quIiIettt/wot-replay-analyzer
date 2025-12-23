// file: src/app/components/RandomBattleAnalyzer.tsx
'use client';

import { useState, useMemo, Fragment } from 'react';
import { UploadCloud, Rocket, Loader2, XCircle, ChevronDown, ChevronUp, ArrowUpDown, Trophy, Map as MapIcon, Swords, Ban, BarChart3 } from 'lucide-react';
import OverallMapsTable from './OverallMapsTable';

// --- Типи даних ---
type MapStats = {
    battles: number;
    wins: number;
    total_damage: number;
    total_kills: number;
    total_assisted: number;
    survived_count: number;
};
type TankStats = {
    battles: number;
    wins: number;
    survived_count: number;
    total_damage: number;
    total_kills: number;
    total_assisted: number;
    maps: Record<string, MapStats>;
};
type AnalysisResults = Record<string, TankStats>;

// Тип для конфігурації сортування
type SortConfig = {
    key: string;
    direction: 'ascending' | 'descending';
};

// Тип сорту для таблиці карт (локально на кожний танк)
type MapSortKey = 'battles' | 'winrate' | 'survivability' | 'avgDamage';
type MapSortConfig = {
    key: MapSortKey;
    direction: 'ascending' | 'descending';
};

const trimTankName = (fullName: string): string => {
    const underscoreIndex = fullName.indexOf('_');
    if (underscoreIndex === -1) { return fullName; }
    const prefix = fullName.substring(0, underscoreIndex);
    if (prefix.match(/^[A-Za-z]{1,2}\d{2,3}$/)) {
        return fullName.substring(underscoreIndex + 1);
    }
    return fullName;
};
const getWinrateColor = (winrate: number): string => {
    if (winrate <= 46) return 'text-rose-300';
    if (winrate <= 52) return 'text-amber-300';
    if (winrate <= 57) return 'text-emerald-300';
    if (winrate <= 63) return 'text-cyan-300';
    return 'text-fuchsia-300';
};
const getAvgDamageColor = (damage: number): string => {
    if (damage <= 1500) return 'text-rose-300';
    if (damage <= 2001) return 'text-orange-300';
    if (damage <= 2501) return 'text-amber-300';
    if (damage <= 3201) return 'text-emerald-300';
    if (damage <= 3900) return 'text-cyan-300';
    return 'text-fuchsia-300';
};

export default function RandomBattleAnalyzer() {
    const [files, setFiles] = useState<File[]>([]);
    const [results, setResults] = useState<AnalysisResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedTank, setExpandedTank] = useState<string | null>(null);
    const [section, setSection] = useState<'overview' | 'maps' | 'tanks' | 'insights'>('overview');
    const fileInputId = 'random-replay-files';

    // загальне сортування по техніці (верхня таблиця)
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'battles', direction: 'descending' });

    // локальні конфіги сортування таблиці карт на кожний танк окремо
    const [mapSortConfigs, setMapSortConfigs] = useState<Record<string, MapSortConfig>>({});

    const getMapSortConfig = (tankName: string): MapSortConfig =>
        mapSortConfigs[tankName] ?? { key: 'battles', direction: 'descending' };

    const setMapSortConfig = (tankName: string, next: MapSortConfig) =>
        setMapSortConfigs(prev => ({ ...prev, [tankName]: next }));

    const handleMapSort = (tankName: string, key: MapSortKey) => {
        const current = getMapSortConfig(tankName);
        let direction: 'ascending' | 'descending' = 'descending';
        if (current.key === key && current.direction === 'descending') direction = 'ascending';
        setMapSortConfig(tankName, { key, direction });
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextFiles = event.target.files ? Array.from(event.target.files) : [];
        if (nextFiles.length) setFiles(nextFiles);
    };

    const handleAnalyze = async () => {
        if (files.length === 0) return;
        setIsLoading(true);
        setError(null);
        setResults(null);
        setExpandedTank(null);
        const formData = new FormData();
        files.forEach((file) => formData.append('replays', file));
        try {
            const response = await fetch('/api/analyze-random', { method: 'POST', body: formData });
            if (!response.ok) throw new Error((await response.json()).error || 'Помилка аналізу');
            const data = await response.json();
            if (Object.keys(data).length === 0) throw new Error("Не вдалося обробити реплеї.");
            setResults(data);
            setSection('overview');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Невідома помилка');
        } finally {
            setIsLoading(false);
        }
    };

    const processedData = useMemo(() => {
        if (!results) return [];
        const dataWithAverages = Object.entries(results).map(([tankName, stats]) => {
            const battleCount = stats.battles;
            return {
                tankName, ...stats,
                winrate: battleCount > 0 ? (stats.wins / battleCount) * 100 : 0,
                survivability: battleCount > 0 ? (stats.survived_count / battleCount) * 100 : 0,
                avgDamage: battleCount > 0 ? stats.total_damage / battleCount : 0,
                avgKills: battleCount > 0 ? stats.total_kills / battleCount : 0,
                avgAssisted: battleCount > 0 ? stats.total_assisted / battleCount : 0,
            };
        });
        return [...dataWithAverages].sort((a, b) => {
            const key = sortConfig.key as keyof typeof a;
            if (a[key] < b[key]) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (a[key] > b[key]) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }, [results, sortConfig]);

    // --- Агрегація статистики по картах з усіх танків ---
    const overallMapStats = useMemo(() => {
        if (!results) return [];
        const allMaps = new Map<string, MapStats>();

        Object.values(results).forEach(tankStats => {
            Object.entries(tankStats.maps).forEach(([mapName, mapData]) => {
                if (!allMaps.has(mapName)) {
                    allMaps.set(mapName, { battles: 0, wins: 0, total_damage: 0, total_kills: 0, total_assisted: 0, survived_count: 0 });
                }
                const currentMap = allMaps.get(mapName)!;
                currentMap.battles += mapData.battles;
                currentMap.wins += mapData.wins;
                currentMap.total_damage += mapData.total_damage;
                currentMap.total_kills += mapData.total_kills;
                currentMap.total_assisted += mapData.total_assisted;
                // survived_count не використовується в цьому блоці, але залишаємо для повноти
            });
        });

        return Array.from(allMaps.entries())
            .map(([mapName, stats]) => {
                const battleCount = stats.battles;
                return {
                    mapName, ...stats,
                    winrate: battleCount > 0 ? (stats.wins / battleCount) * 100 : 0,
                    avgDamage: battleCount > 0 ? stats.total_damage / battleCount : 0,
                };
            })
            .sort((a, b) => b.avgDamage - a.avgDamage); // сортуємо за середнім уроном
    }, [results]);

    const insightMinBattles = 5;
    const insightData = useMemo(() => {
        if (!results) {
            return {
                badMaps: [],
                goodMaps: [],
                popularMaps: [],
                badTanks: [],
                goodTanks: [],
                popularTanks: [],
                maxMapAvgDamage: 0,
                maxMapBattles: 0,
                maxTankAvgDamage: 0,
                maxTankBattles: 0,
            };
        }

        const mapRows = overallMapStats.map((map) => ({
            mapName: map.mapName,
            battles: map.battles,
            avgDamage: map.avgDamage,
        }));
        const filteredMaps = mapRows.filter((map) => map.battles >= insightMinBattles);
        const badMaps = [...filteredMaps]
            .sort((a, b) => a.avgDamage - b.avgDamage)
            .slice(0, 3);
        const goodMaps = [...filteredMaps]
            .sort((a, b) => b.avgDamage - a.avgDamage)
            .slice(0, 3);
        const popularMaps = [...filteredMaps]
            .sort((a, b) => b.battles - a.battles)
            .slice(0, 3);

        const tankRows = Object.entries(results).map(([tankName, stats]) => {
            const battles = stats.battles;
            return {
                tankName: trimTankName(tankName),
                battles,
                avgDamage: battles > 0 ? stats.total_damage / battles : 0,
            };
        });
        const filteredTanks = tankRows.filter((tank) => tank.battles >= insightMinBattles);
        const badTanks = [...filteredTanks]
            .sort((a, b) => a.avgDamage - b.avgDamage)
            .slice(0, 3);
        const goodTanks = [...filteredTanks]
            .sort((a, b) => b.avgDamage - a.avgDamage)
            .slice(0, 3);
        const popularTanks = [...filteredTanks]
            .sort((a, b) => b.battles - a.battles)
            .slice(0, 3);

        const maxMapAvgDamage = filteredMaps.reduce((max, map) => Math.max(max, map.avgDamage), 0);
        const maxMapBattles = filteredMaps.reduce((max, map) => Math.max(max, map.battles), 0);
        const maxTankAvgDamage = filteredTanks.reduce((max, tank) => Math.max(max, tank.avgDamage), 0);
        const maxTankBattles = filteredTanks.reduce((max, tank) => Math.max(max, tank.battles), 0);

        return {
            badMaps,
            goodMaps,
            popularMaps,
            badTanks,
            goodTanks,
            popularTanks,
            maxMapAvgDamage,
            maxMapBattles,
            maxTankAvgDamage,
            maxTankBattles,
        };
    }, [results, overallMapStats]);

    const toggleTankDetails = (tankName: string) => {
        setExpandedTank(expandedTank === tankName ? null : tankName);
    };

    const handleSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'descending';
        if (sortConfig.key === key && sortConfig.direction === 'descending') direction = 'ascending';
        setSortConfig({ key, direction });
    };

    return (
        <div className="relative z-10 w-full max-w-5xl mx-auto space-y-6">
            <div className="glass-panel p-4">
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 flex items-center gap-2">
                    <Swords className="h-4 w-4 text-cyan-300" />
                    Випадкові бої — аналіз реплеїв
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
                    <button
                        onClick={handleAnalyze}
                        disabled={files.length === 0 || isLoading}
                        className="btn-primary w-full sm:w-auto text-xs sm:text-sm font-semibold"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
                        <span>{isLoading ? 'Аналіз...' : 'Почати аналіз'}</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="glass-card border border-rose-400/30 bg-rose-500/10 p-4">
                    <div className="flex items-center">
                        <XCircle className="w-5 h-5 text-rose-300 mr-2" />
                        <div>
                            <p className="font-semibold text-rose-200 text-sm">Помилка</p>
                            <p className="text-rose-100/80 text-sm">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {results && (
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setSection('overview')}
                        className={`btn-ghost shrink-0 whitespace-nowrap text-xs sm:text-sm font-medium ${section === 'overview' ? 'border-white/50 bg-white/10 text-white' : ''}`}
                    >
                        Огляд
                    </button>
                    <button
                        type="button"
                        onClick={() => setSection('maps')}
                        className={`btn-ghost shrink-0 whitespace-nowrap text-xs sm:text-sm font-medium ${section === 'maps' ? 'border-white/50 bg-white/10 text-white' : ''}`}
                    >
                        Усі карти
                    </button>
                    <button
                        type="button"
                        onClick={() => setSection('tanks')}
                        className={`btn-ghost shrink-0 whitespace-nowrap text-xs sm:text-sm font-medium ${section === 'tanks' ? 'border-white/50 bg-white/10 text-white' : ''}`}
                    >
                        Результати по техніці
                    </button>
                    <button
                        type="button"
                        onClick={() => setSection('insights')}
                        className={`btn-ghost shrink-0 whitespace-nowrap text-xs sm:text-sm font-medium ${section === 'insights' ? 'border-white/50 bg-white/10 text-white' : ''}`}
                    >
                        Аналітика
                    </button>
                </div>
            )}

            {/* --- Загальна статистика по картах --- */}
            {results && section === 'overview' && (

                <div className="glass-panel p-4">
                    <h2 className="text-base font-semibold text-white mb-3 flex items-center">
                        <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                        Найкращі карти (загальний результат)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {overallMapStats.slice(0, 3).map(map => (
                            <div key={map.mapName} className="glass-card p-3">
                                <p className="font-bold text-white flex items-center">
                                    <MapIcon className="w-4 h-4 mr-2 text-slate-300" />
                                    {map.mapName}
                                </p>
                                <div className="mt-2 text-sm space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-slate-300">Сер. урон:</span>
                                        <span className={`font-semibold ${getAvgDamageColor(map.avgDamage)}`}>{map.avgDamage.toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-300">Вінрейт:</span>
                                        <span className={`font-semibold ${getWinrateColor(map.winrate)}`}>{map.winrate.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-300">Боїв:</span>
                                        <span className="text-white">{map.battles}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {results && section === 'maps' && (
                <div>
                    <OverallMapsTable results={results} />
                </div>
            )}

            {results && section === 'tanks' && (

                <div className="glass-panel p-4">
                    <h2 className="text-base font-semibold text-white mb-3">Результати по техніці</h2>
                    <div className="table-shell overflow-x-auto overflow-y-visible">
                        <table className="w-full text-left text-xs sm:text-sm text-slate-200">
                            <thead className="table-head">
                            <tr>
                                <th className="px-2.5 py-1.5 font-semibold cursor-pointer hover:bg-white/10" onClick={() => handleSort('tankName')}>
                                    <div className="flex items-center">Техніка <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                                </th>
                                <th className="px-2.5 py-1.5 font-semibold text-center cursor-pointer hover:bg-white/10" onClick={() => handleSort('battles')}>
                                    <div className="flex items-center justify-center">Боїв <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                                </th>
                                <th className="px-2.5 py-1.5 font-semibold text-center cursor-pointer hover:bg-white/10" onClick={() => handleSort('winrate')}>
                                    <div className="flex items-center justify-center">WR % <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                                </th>
                                <th className="px-2.5 py-1.5 font-semibold text-center cursor-pointer hover:bg-white/10" onClick={() => handleSort('survivability')}>
                                    <div className="flex items-center justify-center">Живучість % <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                                </th>
                                <th className="px-2.5 py-1.5 font-semibold text-center cursor-pointer hover:bg-white/10" onClick={() => handleSort('avgDamage')}>
                                    <div className="flex items-center justify-center">Сер. урон <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                                </th>
                                <th className="px-2.5 py-1.5 font-semibold text-center cursor-pointer hover:bg-white/10" onClick={() => handleSort('avgKills')}>
                                    <div className="flex items-center justify-center">Сер. кілли <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                                </th>
                                <th className="px-2.5 py-1.5 font-semibold text-center cursor-pointer hover:bg-white/10" onClick={() => handleSort('avgAssisted')}>
                                    <div className="flex items-center justify-center">Сер. асист <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                                </th>
                                <th className="px-2.5 py-1.5 font-semibold text-center">Карти</th>
                            </tr>
                            </thead>
                            <tbody className="text-slate-200/90">
                            {processedData.map((tank) => (
                                <Fragment key={tank.tankName}>
                                    <tr className="table-row">
                                        <td className="px-2.5 py-1.5 font-bold">{trimTankName(tank.tankName)}</td>
                                        <td className="px-2.5 py-1.5 text-center">{tank.battles}</td>
                                        <td className={`px-2.5 py-1.5 text-center font-semibold ${getWinrateColor(tank.winrate)}`}>{tank.winrate.toFixed(1)}%</td>
                                        <td className="px-2.5 py-1.5 text-center">{tank.survivability.toFixed(1)}%</td>
                                        <td className={`px-2.5 py-1.5 text-center font-bold ${getAvgDamageColor(tank.avgDamage)}`}>{tank.avgDamage.toFixed(0)}</td>
                                        <td className="px-2.5 py-1.5 text-center">{tank.avgKills.toFixed(2)}</td>
                                        <td className="px-2.5 py-1.5 text-center">{tank.avgAssisted.toFixed(0)}</td>
                                        <td className="px-2.5 py-1.5 text-center">
                                            <button onClick={() => toggleTankDetails(tank.tankName)} className="p-1 text-slate-300 hover:text-blue-600">
                                                {expandedTank === tank.tankName ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                            </button>
                                        </td>
                                    </tr>

                                    {expandedTank === tank.tankName && (
                                        <tr className="bg-white/5">
                                            <td colSpan={8} className="p-4">
                                                <h4 className="font-semibold text-md mb-2">Деталі по картах для {trimTankName(tank.tankName)}:</h4>

                                                <div className="table-shell overflow-x-auto overflow-y-visible">
                                                    <table className="w-full text-left text-xs text-slate-200">
                                                    <thead className="table-head">
                                                    <tr>
                                                        <th className="px-2 py-1 font-semibold">Карта</th>

                                                        <th
                                                            className="px-2 py-1 font-semibold text-center cursor-pointer hover:bg-white/10"
                                                            onClick={() => handleMapSort(tank.tankName, 'battles')}
                                                        >
                                                            Боїв <ArrowUpDown className="inline w-3 h-3 ml-1" />
                                                        </th>

                                                        <th
                                                            className="px-2 py-1 font-semibold text-center cursor-pointer hover:bg-white/10"
                                                            onClick={() => handleMapSort(tank.tankName, 'winrate')}
                                                        >
                                                            WR % <ArrowUpDown className="inline w-3 h-3 ml-1" />
                                                        </th>

                                                        <th
                                                            className="px-2 py-1 font-semibold text-center cursor-pointer hover:bg-white/10"
                                                            onClick={() => handleMapSort(tank.tankName, 'survivability')}
                                                        >
                                                            Живучість % <ArrowUpDown className="inline w-3 h-3 ml-1" />
                                                        </th>

                                                        <th
                                                            className="px-2 py-1 font-semibold text-center cursor-pointer hover:bg-white/10"
                                                            onClick={() => handleMapSort(tank.tankName, 'avgDamage')}
                                                        >
                                                            Сер. урон <ArrowUpDown className="inline w-3 h-3 ml-1" />
                                                        </th>
                                                    </tr>
                                                    </thead>
                                                    <tbody>
                                                    {Object.entries(tank.maps)
                                                        .map(([mapName, mapStats]) => {
                                                            const mapBattleCount = mapStats.battles;
                                                            const mapWinrate = mapBattleCount > 0 ? (mapStats.wins / mapBattleCount) * 100 : 0;
                                                            const mapSurvivability = mapBattleCount > 0 ? (mapStats.survived_count / mapBattleCount) * 100 : 0;
                                                            const mapAvgDmg = mapBattleCount > 0 ? mapStats.total_damage / mapBattleCount : 0;
                                                            return {
                                                                mapName,
                                                                battles: mapBattleCount,
                                                                winrate: mapWinrate,
                                                                survivability: mapSurvivability,
                                                                avgDamage: mapAvgDmg
                                                            };
                                                        })
                                                        .sort((a, b) => {
                                                            const cfg = getMapSortConfig(tank.tankName);
                                                            const key = cfg.key;
                                                            if (a[key] < b[key]) return cfg.direction === 'ascending' ? -1 : 1;
                                                            if (a[key] > b[key]) return cfg.direction === 'ascending' ? 1 : -1;
                                                            return 0;
                                                        })
                                                        .map(map => (
                                                            <tr key={map.mapName} className="table-row">
                                                                <td className="px-2 py-1">{map.mapName}</td>
                                                                <td className="px-2 py-1 text-center">{map.battles}</td>
                                                                <td className={`px-2 py-1 text-center font-semibold ${getWinrateColor(map.winrate)}`}>
                                                                    {map.winrate.toFixed(1)}%
                                                                </td>
                                                                <td className="px-2 py-1 text-center">{map.survivability.toFixed(1)}%</td>
                                                                <td className={`px-2 py-1 text-center font-semibold ${getAvgDamageColor(map.avgDamage)}`}>
                                                                    {map.avgDamage.toFixed(0)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {results && section === 'insights' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    <div className="glass-panel p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Ban className="h-4 w-4 text-rose-300" />
                            <h3 className="text-base font-semibold text-white">Бан топ-3 карт</h3>
                        </div>
                        <p className="text-xs text-slate-300 mb-3">
                            Мінімум {insightMinBattles} боїв. Нижчий середній урон = гірша карта.
                        </p>
                        {insightData.badMaps.length === 0 ? (
                            <p className="text-xs text-slate-400">Недостатньо даних для аналізу карт.</p>
                        ) : (
                            <div className="space-y-3">
                                {insightData.badMaps.map((map) => (
                                    <div key={map.mapName} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs text-slate-200">
                                            <span className="font-medium">{map.mapName}</span>
                                            <span className="text-slate-300">{map.avgDamage.toFixed(0)} dmg</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-white/10">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-rose-400 via-orange-300 to-amber-300"
                                                style={{
                                                    width: `${Math.max(
                                                        8,
                                                        Math.min(
                                                            100,
                                                            insightData.maxMapAvgDamage > 0
                                                                ? (map.avgDamage / insightData.maxMapAvgDamage) * 100
                                                                : 0
                                                        )
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="glass-panel p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Trophy className="h-4 w-4 text-emerald-300" />
                            <h3 className="text-base font-semibold text-white">Топ-3 карт по урону</h3>
                        </div>
                        <p className="text-xs text-slate-300 mb-3">
                            Мінімум {insightMinBattles} боїв. Вищий середній урон = краща карта.
                        </p>
                        {insightData.goodMaps.length === 0 ? (
                            <p className="text-xs text-slate-400">Недостатньо даних для аналізу карт.</p>
                        ) : (
                            <div className="space-y-3">
                                {insightData.goodMaps.map((map) => (
                                    <div key={map.mapName} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs text-slate-200">
                                            <span className="font-medium">{map.mapName}</span>
                                            <span className="text-slate-300">{map.avgDamage.toFixed(0)} dmg</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-white/10">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300"
                                                style={{
                                                    width: `${Math.max(
                                                        8,
                                                        Math.min(
                                                            100,
                                                            insightData.maxMapAvgDamage > 0
                                                                ? (map.avgDamage / insightData.maxMapAvgDamage) * 100
                                                                : 0
                                                        )
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="glass-panel p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <MapIcon className="h-4 w-4 text-cyan-300" />
                            <h3 className="text-base font-semibold text-white">Найпопулярніші карти</h3>
                        </div>
                        <p className="text-xs text-slate-300 mb-3">
                            Мінімум {insightMinBattles} боїв. Більше боїв = популярніша карта.
                        </p>
                        {insightData.popularMaps.length === 0 ? (
                            <p className="text-xs text-slate-400">Недостатньо даних для аналізу карт.</p>
                        ) : (
                            <div className="space-y-3">
                                {insightData.popularMaps.map((map) => (
                                    <div key={map.mapName} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs text-slate-200">
                                            <span className="font-medium">{map.mapName}</span>
                                            <span className="text-slate-300">{map.battles} боїв</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-white/10">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300"
                                                style={{
                                                    width: `${Math.max(
                                                        8,
                                                        Math.min(
                                                            100,
                                                            insightData.maxMapBattles > 0
                                                                ? (map.battles / insightData.maxMapBattles) * 100
                                                                : 0
                                                        )
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="glass-panel p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <BarChart3 className="h-4 w-4 text-amber-300" />
                            <h3 className="text-base font-semibold text-white">Бан топ-3 техніки</h3>
                        </div>
                        <p className="text-xs text-slate-300 mb-3">
                            Мінімум {insightMinBattles} боїв. Оцінка за середнім уроном.
                        </p>
                        {insightData.badTanks.length === 0 ? (
                            <p className="text-xs text-slate-400">Недостатньо даних для аналізу техніки.</p>
                        ) : (
                            <div className="space-y-3">
                                {insightData.badTanks.map((tank) => (
                                    <div key={tank.tankName} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs text-slate-200">
                                            <span className="font-medium">{tank.tankName}</span>
                                            <span className="text-slate-300">{tank.avgDamage.toFixed(0)} dmg</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-white/10">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-amber-300 via-emerald-300 to-cyan-300"
                                                style={{
                                                    width: `${Math.max(
                                                        8,
                                                        Math.min(
                                                            100,
                                                            insightData.maxTankAvgDamage > 0
                                                                ? (tank.avgDamage / insightData.maxTankAvgDamage) * 100
                                                                : 0
                                                        )
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="glass-panel p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Swords className="h-4 w-4 text-emerald-300" />
                            <h3 className="text-base font-semibold text-white">Топ-3 техніки по урону</h3>
                        </div>
                        <p className="text-xs text-slate-300 mb-3">
                            Мінімум {insightMinBattles} боїв. Вищий середній урон = краща техніка.
                        </p>
                        {insightData.goodTanks.length === 0 ? (
                            <p className="text-xs text-slate-400">Недостатньо даних для аналізу техніки.</p>
                        ) : (
                            <div className="space-y-3">
                                {insightData.goodTanks.map((tank) => (
                                    <div key={tank.tankName} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs text-slate-200">
                                            <span className="font-medium">{tank.tankName}</span>
                                            <span className="text-slate-300">{tank.avgDamage.toFixed(0)} dmg</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-white/10">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300"
                                                style={{
                                                    width: `${Math.max(
                                                        8,
                                                        Math.min(
                                                            100,
                                                            insightData.maxTankAvgDamage > 0
                                                                ? (tank.avgDamage / insightData.maxTankAvgDamage) * 100
                                                                : 0
                                                        )
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="glass-panel p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <BarChart3 className="h-4 w-4 text-sky-300" />
                            <h3 className="text-base font-semibold text-white">Найпопулярніші техніки</h3>
                        </div>
                        <p className="text-xs text-slate-300 mb-3">
                            Мінімум {insightMinBattles} боїв. Більше боїв = популярніша техніка.
                        </p>
                        {insightData.popularTanks.length === 0 ? (
                            <p className="text-xs text-slate-400">Недостатньо даних для аналізу техніки.</p>
                        ) : (
                            <div className="space-y-3">
                                {insightData.popularTanks.map((tank) => (
                                    <div key={tank.tankName} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs text-slate-200">
                                            <span className="font-medium">{tank.tankName}</span>
                                            <span className="text-slate-300">{tank.battles} боїв</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-white/10">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-sky-300 via-cyan-300 to-indigo-300"
                                                style={{
                                                    width: `${Math.max(
                                                        8,
                                                        Math.min(
                                                            100,
                                                            insightData.maxTankBattles > 0
                                                                ? (tank.battles / insightData.maxTankBattles) * 100
                                                                : 0
                                                        )
                                                    )}%`,
                                                }}
                                            />
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
