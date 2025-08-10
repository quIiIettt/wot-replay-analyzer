// file: src/app/components/OverallMapsTable.tsx
'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown, Map as MapIcon } from 'lucide-react';

// --- Локальні типи (щоб компонент був самодостатній) ---
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

type Props = {
    results: AnalysisResults;
    title?: string; // опційно інша назва блоку
};

// --- Хелпери кольорів/метрик ---
const getWinrateColor = (winrate: number): string => {
    if (winrate <= 46) return 'text-red-500';
    if (winrate <= 52) return 'text-yellow-500';
    if (winrate <= 57) return 'text-green-500';
    if (winrate <= 63) return 'text-cyan-400';
    return 'text-purple-500';
};
const getAvgDamageColor = (damage: number): string => {
    if (damage <= 1500) return 'text-red-500';
    if (damage <= 2001) return 'text-orange-500';
    if (damage <= 2501) return 'text-yellow-500';
    if (damage <= 3201) return 'text-green-500';
    if (damage <= 3900) return 'text-cyan-400';
    return 'text-purple-500';
};

type SortKey = 'mapName' | 'battles' | 'winrate' | 'survivability' | 'avgDamage' | 'avgKills' | 'avgAssisted';
type Direction = 'ascending' | 'descending';

export default function OverallMapsTable({ results, title = 'Усі карти (зведена статистика)' }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>('avgDamage');
    const [direction, setDirection] = useState<Direction>('descending');

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setDirection(prev => (prev === 'descending' ? 'ascending' : 'descending'));
        } else {
            setSortKey(key);
            setDirection('descending');
        }
    };

    const rows = useMemo(() => {
        const all = new Map<string, MapStats>();

        // Агрегація з усіх танків
        Object.values(results).forEach(tank => {
            Object.entries(tank.maps).forEach(([mapName, s]) => {
                if (!all.has(mapName)) {
                    all.set(mapName, {
                        battles: 0, wins: 0, total_damage: 0, total_kills: 0, total_assisted: 0, survived_count: 0
                    });
                }
                const m = all.get(mapName)!;
                m.battles += s.battles;
                m.wins += s.wins;
                m.total_damage += s.total_damage;
                m.total_kills += s.total_kills;
                m.total_assisted += s.total_assisted;
                m.survived_count += s.survived_count;
            });
        });

        const arr = Array.from(all.entries()).map(([mapName, s]) => {
            const b = s.battles || 0;
            const winrate = b ? (s.wins / b) * 100 : 0;
            const survivability = b ? (s.survived_count / b) * 100 : 0;
            const avgDamage = b ? s.total_damage / b : 0;
            const avgKills = b ? s.total_kills / b : 0;
            const avgAssisted = b ? s.total_assisted / b : 0;
            return { mapName, battles: b, winrate, survivability, avgDamage, avgKills, avgAssisted };
        });

        arr.sort((a, b) => {
            let va: number | string = a[sortKey];
            let vb: number | string = b[sortKey];
            // алфавіт для назви карти
            if (sortKey === 'mapName') {
                const res = String(va).localeCompare(String(vb), 'uk', { sensitivity: 'base' });
                return direction === 'ascending' ? res : -res;
            }
            // числові поля
            const res = (va as number) - (vb as number);
            return direction === 'ascending' ? res : -res;
        });

        return arr;
    }, [results, sortKey, direction]);

    return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <MapIcon className="w-5 h-5 mr-2 text-gray-600" />
                {title}
            </h2>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                    <tr>
                        <Th label="Карта" onClick={() => handleSort('mapName')} />
                        <Th label="Боїв" center onClick={() => handleSort('battles')} />
                        <Th label="WR %" center onClick={() => handleSort('winrate')} />
                        <Th label="Живучість %" center onClick={() => handleSort('survivability')} />
                        <Th label="Сер. урон" center onClick={() => handleSort('avgDamage')} />
                        <Th label="Сер. кілли" center onClick={() => handleSort('avgKills')} />
                        <Th label="Сер. асист" center onClick={() => handleSort('avgAssisted')} />
                    </tr>
                    </thead>
                    <tbody className="text-gray-700">
                    {rows.map(row => (
                        <tr key={row.mapName} className="border-b last:border-b-0 hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium">{row.mapName}</td>
                            <td className="px-3 py-2 text-center">{row.battles}</td>
                            <td className={`px-3 py-2 text-center font-semibold ${getWinrateColor(row.winrate)}`}>
                                {row.winrate.toFixed(1)}%
                            </td>
                            <td className="px-3 py-2 text-center">{row.survivability.toFixed(1)}%</td>
                            <td className={`px-3 py-2 text-center font-semibold ${getAvgDamageColor(row.avgDamage)}`}>
                                {row.avgDamage.toFixed(0)}
                            </td>
                            <td className="px-3 py-2 text-center">{row.avgKills.toFixed(2)}</td>
                            <td className="px-3 py-2 text-center">{row.avgAssisted.toFixed(0)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* Маленька підказка */}
            <p className="text-xs text-gray-500 mt-2">
                Підсумки по кожній карті зібрані з усіх реплеїв незалежно від техніки.
            </p>
        </div>
    );
}

// Невеликий підзаголовок-TH з іконкою сорту
function Th({ label, onClick, center = false }: { label: string; onClick?: () => void; center?: boolean }) {
    return (
        <th
            className={`px-3 py-2 font-semibold ${center ? 'text-center' : ''} cursor-pointer hover:bg-gray-200`}
            onClick={onClick}
        >
            <div className={`flex items-center ${center ? 'justify-center' : ''}`}>
                {label} <ArrowUpDown className="w-3 h-3 ml-1" />
            </div>
        </th>
    );
}
