'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown, Map as MapIcon } from 'lucide-react';

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
  title?: string;
};

const getWinrateColor = (winrate: number): string => {
  if (winrate <= 46) return 'text-zinc-500';
  if (winrate <= 52) return 'text-zinc-400';
  if (winrate <= 57) return 'text-zinc-300';
  if (winrate <= 63) return 'text-zinc-200';
  return 'text-zinc-100';
};

const getAvgDamageColor = (damage: number): string => {
  if (damage <= 1500) return 'text-zinc-500';
  if (damage <= 2001) return 'text-zinc-400';
  if (damage <= 2501) return 'text-zinc-300';
  if (damage <= 3201) return 'text-zinc-200';
  if (damage <= 3900) return 'text-zinc-100';
  return 'text-white';
};

type SortKey = 'mapName' | 'battles' | 'winrate' | 'survivability' | 'avgDamage' | 'avgKills' | 'avgAssisted';
type Direction = 'ascending' | 'descending';

export default function OverallMapsTable({ results, title = 'All Maps (combined stats)' }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('avgDamage');
  const [direction, setDirection] = useState<Direction>('descending');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setDirection((prev) => (prev === 'descending' ? 'ascending' : 'descending'));
      return;
    }

    setSortKey(key);
    setDirection('descending');
  };

  const rows = useMemo(() => {
    const allMaps = new Map<string, MapStats>();

    Object.values(results).forEach((tank) => {
      Object.entries(tank.maps).forEach(([mapName, stats]) => {
        if (!allMaps.has(mapName)) {
          allMaps.set(mapName, {
            battles: 0,
            wins: 0,
            total_damage: 0,
            total_kills: 0,
            total_assisted: 0,
            survived_count: 0,
          });
        }

        const map = allMaps.get(mapName)!;
        map.battles += stats.battles;
        map.wins += stats.wins;
        map.total_damage += stats.total_damage;
        map.total_kills += stats.total_kills;
        map.total_assisted += stats.total_assisted;
        map.survived_count += stats.survived_count;
      });
    });

    const combined = Array.from(allMaps.entries()).map(([mapName, stats]) => {
      const battles = stats.battles;
      return {
        mapName,
        battles,
        winrate: battles ? (stats.wins / battles) * 100 : 0,
        survivability: battles ? (stats.survived_count / battles) * 100 : 0,
        avgDamage: battles ? stats.total_damage / battles : 0,
        avgKills: battles ? stats.total_kills / battles : 0,
        avgAssisted: battles ? stats.total_assisted / battles : 0,
      };
    });

    combined.sort((left, right) => {
      const leftValue: string | number = left[sortKey];
      const rightValue: string | number = right[sortKey];

      if (sortKey === 'mapName') {
        const compareResult = String(leftValue).localeCompare(String(rightValue), 'en', { sensitivity: 'base' });
        return direction === 'ascending' ? compareResult : -compareResult;
      }

      const numericResult = (leftValue as number) - (rightValue as number);
      return direction === 'ascending' ? numericResult : -numericResult;
    });

    return combined;
  }, [results, sortKey, direction]);

  return (
    <div className="glass-panel p-4">
      <h2 className="mb-3 flex items-center text-base font-semibold text-white">
        <MapIcon className="mr-2 h-4 w-4 text-slate-300" />
        {title}
      </h2>

      <div className="table-shell overflow-x-auto overflow-y-visible">
        <table className="w-full text-left text-xs text-slate-200 sm:text-sm">
          <thead className="table-head">
            <tr>
              <Th label="Map" onClick={() => handleSort('mapName')} />
              <Th label="Battles" center onClick={() => handleSort('battles')} />
              <Th label="WR %" center onClick={() => handleSort('winrate')} />
              <Th label="Survival %" center onClick={() => handleSort('survivability')} />
              <Th label="Avg damage" center onClick={() => handleSort('avgDamage')} />
              <Th label="Avg kills" center onClick={() => handleSort('avgKills')} />
              <Th label="Avg assist" center onClick={() => handleSort('avgAssisted')} />
            </tr>
          </thead>
          <tbody className="text-slate-200/90">
            {rows.map((row) => (
              <tr key={row.mapName} className="table-row">
                <td className="px-2.5 py-1.5 font-medium">{row.mapName}</td>
                <td className="px-2.5 py-1.5 text-center">{row.battles}</td>
                <td className={`px-2.5 py-1.5 text-center font-semibold ${getWinrateColor(row.winrate)}`}>{row.winrate.toFixed(1)}%</td>
                <td className="px-2.5 py-1.5 text-center">{row.survivability.toFixed(1)}%</td>
                <td className={`px-2.5 py-1.5 text-center font-semibold ${getAvgDamageColor(row.avgDamage)}`}>{row.avgDamage.toFixed(0)}</td>
                <td className="px-2.5 py-1.5 text-center">{row.avgKills.toFixed(2)}</td>
                <td className="px-2.5 py-1.5 text-center">{row.avgAssisted.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-1 text-xs text-slate-300">Each map row is aggregated from all uploaded replays and all vehicles.</p>
    </div>
  );
}

function Th({ label, onClick, center = false }: { label: string; onClick?: () => void; center?: boolean }) {
  return (
    <th className={`cursor-pointer px-2.5 py-1.5 font-semibold hover:bg-white/10 ${center ? 'text-center' : ''}`} onClick={onClick}>
      <div className={`flex items-center ${center ? 'justify-center' : ''}`}>
        {label}
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </div>
    </th>
  );
}
