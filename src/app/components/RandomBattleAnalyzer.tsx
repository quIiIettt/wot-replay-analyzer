'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, Loader2, Rocket, Swords, UploadCloud, XCircle } from 'lucide-react';
import CustomScroll from './CustomScroll';
import CustomSelect from './CustomSelect';

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

type SortDirection = 'ascending' | 'descending';
type TankSortKey = 'tankName' | 'battles' | 'winrate' | 'survivability' | 'avgDamage' | 'avgKills' | 'avgAssisted';
type MapSortKey = 'mapName' | 'battles' | 'winrate' | 'survivability' | 'avgDamage' | 'avgKills' | 'avgAssisted';

type TankRow = {
  tankName: string;
  battles: number;
  winrate: number;
  survivability: number;
  avgDamage: number;
  avgKills: number;
  avgAssisted: number;
};

type MapRow = {
  mapName: string;
  battles: number;
  winrate: number;
  survivability: number;
  avgDamage: number;
  avgKills: number;
  avgAssisted: number;
};

type MapTankRow = {
  mapName: string;
  tankName: string;
  battles: number;
  winrate: number;
  survivability: number;
  avgDamage: number;
  avgKills: number;
  avgAssisted: number;
};

function trimTankName(fullName: string): string {
  const underscoreIndex = fullName.indexOf('_');
  if (underscoreIndex === -1) {
    return fullName;
  }

  const prefix = fullName.substring(0, underscoreIndex);
  if (prefix.match(/^[A-Za-z]{1,2}\d{2,3}$/)) {
    return fullName.substring(underscoreIndex + 1);
  }

  return fullName;
}

function getWinrateColor(winrate: number): string {
  if (winrate <= 46) return 'text-zinc-500';
  if (winrate <= 52) return 'text-zinc-400';
  if (winrate <= 57) return 'text-zinc-300';
  if (winrate <= 63) return 'text-zinc-200';
  return 'text-zinc-100';
}

function getAvgDamageColor(damage: number): string {
  if (damage <= 1500) return 'text-zinc-500';
  if (damage <= 2000) return 'text-zinc-400';
  if (damage <= 2500) return 'text-zinc-300';
  if (damage <= 3200) return 'text-zinc-200';
  if (damage <= 3900) return 'text-zinc-100';
  return 'text-white';
}

function batchFilesBySize(files: File[], maxBatchBytes = 16 * 1024 * 1024, maxFilesPerBatch = 25): File[][] {
  const batches: File[][] = [];
  let current: File[] = [];
  let currentBytes = 0;

  for (const file of files) {
    const fitsBySize = currentBytes + file.size <= maxBatchBytes;
    const fitsByCount = current.length < maxFilesPerBatch;

    if (current.length > 0 && (!fitsBySize || !fitsByCount)) {
      batches.push(current);
      current = [file];
      currentBytes = file.size;
    } else {
      current.push(file);
      currentBytes += file.size;
    }
  }

  if (current.length > 0) {
    batches.push(current);
  }

  return batches;
}

function mergeRandomResults(parts: AnalysisResults[]): AnalysisResults {
  const merged: AnalysisResults = {};

  for (const part of parts) {
    for (const [tankName, stats] of Object.entries(part)) {
      const tankTarget =
        merged[tankName] ??
        (merged[tankName] = {
          battles: 0,
          wins: 0,
          survived_count: 0,
          total_damage: 0,
          total_kills: 0,
          total_assisted: 0,
          maps: {},
        });

      tankTarget.battles += stats.battles;
      tankTarget.wins += stats.wins;
      tankTarget.survived_count += stats.survived_count;
      tankTarget.total_damage += stats.total_damage;
      tankTarget.total_kills += stats.total_kills;
      tankTarget.total_assisted += stats.total_assisted;

      for (const [mapName, mapStats] of Object.entries(stats.maps)) {
        const mapTarget =
          tankTarget.maps[mapName] ??
          (tankTarget.maps[mapName] = {
            battles: 0,
            wins: 0,
            survived_count: 0,
            total_damage: 0,
            total_kills: 0,
            total_assisted: 0,
          });

        mapTarget.battles += mapStats.battles;
        mapTarget.wins += mapStats.wins;
        mapTarget.survived_count += mapStats.survived_count;
        mapTarget.total_damage += mapStats.total_damage;
        mapTarget.total_kills += mapStats.total_kills;
        mapTarget.total_assisted += mapStats.total_assisted;
      }
    }
  }

  return merged;
}

export default function RandomBattleAnalyzer() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [section, setSection] = useState<'summary' | 'analytics'>('summary');
  const [mapMinBattles, setMapMinBattles] = useState(5);
  const [selectedMap, setSelectedMap] = useState('');
  const [tankSort, setTankSort] = useState<{ key: TankSortKey; direction: SortDirection }>({
    key: 'avgDamage',
    direction: 'descending',
  });
  const [mapSort, setMapSort] = useState<{ key: MapSortKey; direction: SortDirection }>({
    key: 'avgDamage',
    direction: 'descending',
  });

  const fileInputId = 'random-replay-files';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files ? Array.from(event.target.files) : [];
    setFiles(next);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const batches = batchFilesBySize(files, 16 * 1024 * 1024, 25);
      const chunks: AnalysisResults[] = [];

      for (const group of batches) {
        const formData = new FormData();
        group.forEach((file) => formData.append('replays', file, file.name));

        const response = await fetch('/api/analyze-random', {
          method: 'POST',
          body: formData,
        });

        const rawText = await response.text();
        let parsed: AnalysisResults;

        try {
          parsed = JSON.parse(rawText) as AnalysisResults;
        } catch {
          throw new Error(`Сервер повернув некоректну відповідь (status ${response.status}).`);
        }

        if (Object.keys(parsed).length > 0) {
          chunks.push(parsed);
        }
      }

      const merged = mergeRandomResults(chunks);
      if (Object.keys(merged).length === 0) {
        throw new Error('Не вдалося обробити реплеї. Перевірте, що це random бої.');
      }

      setResults(merged);
      setSection('summary');
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'Невідома помилка аналізу.');
    } finally {
      setIsLoading(false);
    }
  };

  const tankRows = useMemo<TankRow[]>(() => {
    if (!results) {
      return [];
    }

    const rows = Object.entries(results).map(([tankName, stats]) => {
      const battles = stats.battles;
      return {
        tankName,
        battles,
        winrate: battles > 0 ? (stats.wins / battles) * 100 : 0,
        survivability: battles > 0 ? (stats.survived_count / battles) * 100 : 0,
        avgDamage: battles > 0 ? stats.total_damage / battles : 0,
        avgKills: battles > 0 ? stats.total_kills / battles : 0,
        avgAssisted: battles > 0 ? stats.total_assisted / battles : 0,
      };
    });

    return [...rows].sort((left, right) => {
      const key = tankSort.key;
      const leftValue = left[key];
      const rightValue = right[key];

      if (typeof leftValue === 'string' && typeof rightValue === 'string') {
        const compareResult = leftValue.localeCompare(rightValue, 'uk', { sensitivity: 'base' });
        return tankSort.direction === 'ascending' ? compareResult : -compareResult;
      }

      const numericResult = Number(leftValue) - Number(rightValue);
      return tankSort.direction === 'ascending' ? numericResult : -numericResult;
    });
  }, [results, tankSort]);

  const mapRows = useMemo<MapRow[]>(() => {
    if (!results) {
      return [];
    }

    const mapAccumulator = new Map<string, MapStats>();

    for (const tankStats of Object.values(results)) {
      for (const [mapName, mapStats] of Object.entries(tankStats.maps)) {
        const row =
          mapAccumulator.get(mapName) ??
          {
            battles: 0,
            wins: 0,
            total_damage: 0,
            total_kills: 0,
            total_assisted: 0,
            survived_count: 0,
          };

        row.battles += mapStats.battles;
        row.wins += mapStats.wins;
        row.total_damage += mapStats.total_damage;
        row.total_kills += mapStats.total_kills;
        row.total_assisted += mapStats.total_assisted;
        row.survived_count += mapStats.survived_count;

        mapAccumulator.set(mapName, row);
      }
    }

    return Array.from(mapAccumulator.entries()).map(([mapName, stats]) => ({
        mapName,
        battles: stats.battles,
        winrate: stats.battles > 0 ? (stats.wins / stats.battles) * 100 : 0,
        survivability: stats.battles > 0 ? (stats.survived_count / stats.battles) * 100 : 0,
        avgDamage: stats.battles > 0 ? stats.total_damage / stats.battles : 0,
        avgKills: stats.battles > 0 ? stats.total_kills / stats.battles : 0,
        avgAssisted: stats.battles > 0 ? stats.total_assisted / stats.battles : 0,
      }));
  }, [results]);

  const sortedMapRows = useMemo(() => {
    return [...mapRows].sort((left, right) => {
      const key = mapSort.key;
      const leftValue = left[key];
      const rightValue = right[key];

      if (typeof leftValue === 'string' && typeof rightValue === 'string') {
        const compareResult = leftValue.localeCompare(rightValue, 'uk', { sensitivity: 'base' });
        return mapSort.direction === 'ascending' ? compareResult : -compareResult;
      }

      const numericResult = Number(leftValue) - Number(rightValue);
      return mapSort.direction === 'ascending' ? numericResult : -numericResult;
    });
  }, [mapRows, mapSort]);

  const mapTankRows = useMemo<MapTankRow[]>(() => {
    if (!results) {
      return [];
    }

    const rows: MapTankRow[] = [];

    for (const [tankName, tankStats] of Object.entries(results)) {
      for (const [mapName, mapStats] of Object.entries(tankStats.maps)) {
        const battles = mapStats.battles;
        rows.push({
          mapName,
          tankName,
          battles,
          winrate: battles > 0 ? (mapStats.wins / battles) * 100 : 0,
          survivability: battles > 0 ? (mapStats.survived_count / battles) * 100 : 0,
          avgDamage: battles > 0 ? mapStats.total_damage / battles : 0,
          avgKills: battles > 0 ? mapStats.total_kills / battles : 0,
          avgAssisted: battles > 0 ? mapStats.total_assisted / battles : 0,
        });
      }
    }

    return rows;
  }, [results]);

  useEffect(() => {
    if (mapRows.length === 0) {
      setSelectedMap('');
      return;
    }

    if (!selectedMap || !mapRows.some((map) => map.mapName === selectedMap)) {
      setSelectedMap(mapRows[0].mapName);
    }
  }, [mapRows, selectedMap]);

  const selectedMapTopTanks = useMemo(() => {
    return mapTankRows
      .filter((row) => row.mapName === selectedMap && row.battles >= mapMinBattles)
      .sort((left, right) => right.avgDamage - left.avgDamage)
      .slice(0, 12);
  }, [mapMinBattles, mapTankRows, selectedMap]);

  const bestDamageMap =
    [...mapRows]
      .filter((row) => row.battles >= mapMinBattles)
      .sort((left, right) => right.avgDamage - left.avgDamage)[0] ?? null;
  const bestWinrateMap =
    [...mapRows]
      .filter((row) => row.battles >= mapMinBattles)
      .sort((left, right) => right.winrate - left.winrate)[0] ?? null;
  const bestSurvivalMap =
    [...mapRows]
      .filter((row) => row.battles >= mapMinBattles)
      .sort((left, right) => right.survivability - left.survivability)[0] ?? null;

  const handleSort = (key: TankSortKey) => {
    setTankSort((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === 'descending' ? 'ascending' : 'descending',
        };
      }

      return {
        key,
        direction: 'descending',
      };
    });
  };

  const handleMapSort = (key: MapSortKey) => {
    setMapSort((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === 'descending' ? 'ascending' : 'descending',
        };
      }

      return {
        key,
        direction: 'descending',
      };
    });
  };

  const SCROLL_THRESHOLD = 12;
  const tankScrollEnabled = tankRows.length >= SCROLL_THRESHOLD;
  const mapScrollEnabled = sortedMapRows.length >= SCROLL_THRESHOLD;

  return (
    <div className="space-y-6">
      <section className="glass-panel p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Swords className="h-4 w-4" />
          <h1 className="text-lg font-semibold text-white sm:text-xl">Випадкові бої</h1>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            id={fileInputId}
            type="file"
            multiple
            accept=".wotreplay,.WOTREPLAY"
            onClick={(event) => {
              event.currentTarget.value = '';
            }}
            onChange={handleFileChange}
            className="sr-only"
          />

          <label htmlFor={fileInputId} className="btn-secondary w-full sm:w-auto">
            <UploadCloud className="h-4 w-4" />
            Обрати файли
          </label>

          <p className="text-sm text-slate-300">
            {files.length > 0 ? `Обрано файлів: ${files.length}` : 'Завантажте .wotreplay файли random боїв'}
          </p>

          <button type="button" onClick={handleAnalyze} disabled={isLoading || files.length === 0} className="btn-primary w-full sm:ml-auto sm:w-auto">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {isLoading ? 'Аналіз...' : 'Почати аналіз'}
          </button>
        </div>
      </section>

      {error && (
        <section className="panel-muted border border-white/20 p-4 text-sm text-slate-200">
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-4 w-4" />
            <p>{error}</p>
          </div>
        </section>
      )}

      {results && (
        <section className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSection('summary')}
            className={`btn-linkish ${section === 'summary' ? 'border-white/30 bg-white/10 text-white' : ''}`}
          >
            Огляд
          </button>
          <button
            type="button"
            onClick={() => setSection('analytics')}
            className={`btn-linkish ${section === 'analytics' ? 'border-white/30 bg-white/10 text-white' : ''}`}
          >
            Аналітика
          </button>
        </section>
      )}

      {results && section === 'summary' && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <article className={`glass-panel flex min-h-0 flex-col p-4 xl:col-span-3 ${tankScrollEnabled ? 'max-h-[34rem]' : ''}`}>
            <h2 className="mb-3 text-base font-semibold text-white">Результати по техніці</h2>
            <div className={`table-shell min-h-0 overflow-hidden ${tankScrollEnabled ? 'flex-1' : ''}`}>
              <CustomScroll enabled={tankScrollEnabled} className={tankScrollEnabled ? 'h-full overflow-x-auto' : 'overflow-x-auto'}>
                <table className="w-full text-left text-xs sm:text-sm text-slate-100">
                  <thead className="table-head">
                    <tr>
                      <SortableHeader label="Техніка" onClick={() => handleSort('tankName')} />
                      <SortableHeader center label="Боів" onClick={() => handleSort('battles')} />
                      <SortableHeader center label="WR %" onClick={() => handleSort('winrate')} />
                      <SortableHeader center label="Живучість %" onClick={() => handleSort('survivability')} />
                      <SortableHeader center label="Сер. урон" onClick={() => handleSort('avgDamage')} />
                    </tr>
                  </thead>
                  <tbody>
                    {tankRows.map((row) => (
                      <tr key={row.tankName} className="table-row">
                        <td className="px-2.5 py-2">{trimTankName(row.tankName)}</td>
                        <td className="px-2.5 py-2 text-center">{row.battles}</td>
                        <td className={`px-2.5 py-2 text-center font-semibold ${getWinrateColor(row.winrate)}`}>{row.winrate.toFixed(1)}%</td>
                        <td className="px-2.5 py-2 text-center">{row.survivability.toFixed(1)}%</td>
                        <td className={`px-2.5 py-2 text-center font-semibold ${getAvgDamageColor(row.avgDamage)}`}>{row.avgDamage.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CustomScroll>
            </div>
          </article>

          <article className={`glass-panel flex h-full min-h-0 flex-col p-4 xl:col-span-2 ${mapScrollEnabled ? 'max-h-[34rem]' : ''}`}>
            <h2 className="mb-3 text-base font-semibold text-white">Карти</h2>
            <div className={`table-shell min-h-0 overflow-hidden ${mapScrollEnabled ? 'flex-1' : ''}`}>
              <CustomScroll enabled={mapScrollEnabled} className={mapScrollEnabled ? 'h-full overflow-x-auto' : 'overflow-x-auto'}>
                <table className="w-full text-left text-xs sm:text-sm text-slate-100">
                  <thead className="table-head">
                    <tr>
                      <SortableHeader label="Карта" onClick={() => handleMapSort('mapName')} />
                      <SortableHeader center label="Боів" onClick={() => handleMapSort('battles')} />
                      <SortableHeader center label="Сер. урон" onClick={() => handleMapSort('avgDamage')} />
                      <SortableHeader center label="WR %" onClick={() => handleMapSort('winrate')} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMapRows.map((row) => (
                      <tr key={row.mapName} className="table-row">
                        <td className="px-2.5 py-2">{row.mapName}</td>
                        <td className="px-2.5 py-2 text-center">{row.battles}</td>
                        <td className={`px-2.5 py-2 text-center font-semibold ${getAvgDamageColor(row.avgDamage)}`}>{row.avgDamage.toFixed(0)}</td>
                        <td className={`px-2.5 py-2 text-center font-semibold ${getWinrateColor(row.winrate)}`}>{row.winrate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CustomScroll>
            </div>
          </article>
        </section>
      )}

      {results && section === 'analytics' && (
        <section className="min-h-[34rem] space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 sm:text-sm">
              Мін. боїв для KPI
              <input
                type="number"
                min={1}
                className="input w-16"
                value={mapMinBattles}
                onChange={(event) => setMapMinBattles(Math.max(1, Number(event.target.value) || 1))}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <article className="kpi-card">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Кращий avg dmg</p>
              {bestDamageMap ? (
                <>
                  <p className="mt-2 text-lg font-semibold text-white">{bestDamageMap.mapName}</p>
                  <p className={`mt-1 text-sm ${getAvgDamageColor(bestDamageMap.avgDamage)}`}>{bestDamageMap.avgDamage.toFixed(0)} середній урон</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-300">Недостатньо даних</p>
              )}
            </article>

            <article className="kpi-card">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Кращий WR</p>
              {bestWinrateMap ? (
                <>
                  <p className="mt-2 text-lg font-semibold text-white">{bestWinrateMap.mapName}</p>
                  <p className={`mt-1 text-sm ${getWinrateColor(bestWinrateMap.winrate)}`}>{bestWinrateMap.winrate.toFixed(1)}% WR</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-300">Недостатньо даних</p>
              )}
            </article>

            <article className="kpi-card">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Найкраща живучість</p>
              {bestSurvivalMap ? (
                <>
                  <p className="mt-2 text-lg font-semibold text-white">{bestSurvivalMap.mapName}</p>
                  <p className="mt-1 text-sm text-zinc-200">{bestSurvivalMap.survivability.toFixed(1)}% виживання</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-300">Недостатньо даних</p>
              )}
            </article>
          </div>

          <article className="glass-panel p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">Найкращі танки на певній карті</h2>
              <CustomSelect value={selectedMap} onChange={(event) => setSelectedMap(event.target.value)} className="min-w-[180px]">
                {mapRows.map((map) => (
                  <option key={map.mapName} value={map.mapName}>
                    {map.mapName}
                  </option>
                ))}
              </CustomSelect>
            </div>

            <div className="table-shell overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-100">
                <thead className="table-head">
                  <tr>
                    <th className="px-2.5 py-2">#</th>
                    <th className="px-2.5 py-2">Техніка</th>
                    <th className="px-2.5 py-2 text-center">Боів</th>
                    <th className="px-2.5 py-2 text-center">Сер. урон</th>
                    <th className="px-2.5 py-2 text-center">WR %</th>
                    <th className="px-2.5 py-2 text-center">Живучість %</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMapTopTanks.map((row, index) => (
                    <tr key={`${row.mapName}-${row.tankName}`} className="table-row">
                      <td className="px-2.5 py-2">{index + 1}</td>
                      <td className="px-2.5 py-2">{trimTankName(row.tankName)}</td>
                      <td className="px-2.5 py-2 text-center">{row.battles}</td>
                      <td className={`px-2.5 py-2 text-center font-semibold ${getAvgDamageColor(row.avgDamage)}`}>{row.avgDamage.toFixed(0)}</td>
                      <td className={`px-2.5 py-2 text-center font-semibold ${getWinrateColor(row.winrate)}`}>{row.winrate.toFixed(1)}%</td>
                      <td className="px-2.5 py-2 text-center">{row.survivability.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedMapTopTanks.length === 0 && (
              <p className="mt-3 text-sm text-slate-300">Немає достатніх даних по цій карті для вказаного порогу боїв.</p>
            )}
          </article>

          <article className="glass-panel p-4">
            <h3 className="mb-3 text-base font-semibold text-white">Топ карт за середнім уроном</h3>
            <div className="table-shell overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-100">
                <thead className="table-head">
                  <tr>
                    <th className="px-2.5 py-2">Карта</th>
                    <th className="px-2.5 py-2 text-center">Боів</th>
                    <th className="px-2.5 py-2 text-center">Сер. урон</th>
                    <th className="px-2.5 py-2 text-center">WR %</th>
                    <th className="px-2.5 py-2 text-center">Живучість %</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMapRows.slice(0, 12).map((row) => (
                    <tr key={row.mapName} className="table-row">
                      <td className="px-2.5 py-2">{row.mapName}</td>
                      <td className="px-2.5 py-2 text-center">{row.battles}</td>
                      <td className={`px-2.5 py-2 text-center font-semibold ${getAvgDamageColor(row.avgDamage)}`}>{row.avgDamage.toFixed(0)}</td>
                      <td className={`px-2.5 py-2 text-center font-semibold ${getWinrateColor(row.winrate)}`}>{row.winrate.toFixed(1)}%</td>
                      <td className="px-2.5 py-2 text-center">{row.survivability.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}
    </div>
  );
}

function SortableHeader({
  label,
  onClick,
  center = false,
}: {
  label: string;
  onClick: () => void;
  center?: boolean;
}) {
  return (
    <th className={`cursor-pointer px-2.5 py-2 hover:bg-white/10 ${center ? 'text-center' : ''}`} onClick={onClick}>
      <span className={`inline-flex items-center gap-1 ${center ? 'justify-center' : ''}`}>
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </span>
    </th>
  );
}
