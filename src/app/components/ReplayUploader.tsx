'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, Loader2, Rocket, Shield, UploadCloud, XCircle } from 'lucide-react';

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

type SortDirection = 'ascending' | 'descending';
type PlayerSortKey = 'name' | 'battleCount' | 'avgDamage' | 'avgKills' | 'avgAssisted';

type PlayerRow = {
  name: string;
  battleCount: number;
  avgDamage: number;
  avgKills: number;
  avgAssisted: number;
};

type MapPerformanceRow = {
  mapName: string;
  battles: number;
  avgDamage: number;
  avgKills: number;
  avgAssisted: number;
};

type MapPlayerRow = {
  mapName: string;
  playerName: string;
  battles: number;
  avgDamage: number;
  avgKills: number;
  avgAssisted: number;
};

function trimTankName(fullName: string): string {
  const parts = fullName.split('_');
  if (parts.length > 1) {
    return parts.slice(1).join('_');
  }
  return fullName;
}

function getWinrateColor(winrate: number): string {
  if (winrate <= 46) return 'text-rose-300';
  if (winrate <= 52) return 'text-amber-300';
  if (winrate <= 57) return 'text-emerald-300';
  if (winrate <= 63) return 'text-cyan-300';
  return 'text-fuchsia-300';
}

function getAvgDamageColor(damage: number): string {
  if (damage <= 1400) return 'text-rose-300';
  if (damage <= 1700) return 'text-orange-300';
  if (damage <= 2100) return 'text-amber-300';
  if (damage <= 2600) return 'text-emerald-300';
  if (damage <= 3200) return 'text-cyan-300';
  return 'text-fuchsia-300';
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

function mergeAnalysisResults(parts: AnalysisResults[]): AnalysisResults {
  const merged: AnalysisResults = {
    player_stats: {},
    map_stats: {},
  };

  for (const part of parts) {
    for (const [playerName, playerStats] of Object.entries(part.player_stats)) {
      const target =
        merged.player_stats[playerName] ??
        (merged.player_stats[playerName] = {
          battles: [],
          total_damage: 0,
          total_kills: 0,
          total_assisted: 0,
        });

      target.battles.push(...playerStats.battles);
      target.total_damage += playerStats.total_damage;
      target.total_kills += playerStats.total_kills;
      target.total_assisted += playerStats.total_assisted;
    }

    for (const [mapName, mapStats] of Object.entries(part.map_stats)) {
      const target = merged.map_stats[mapName] ?? (merged.map_stats[mapName] = { wins: 0, battles: 0 });
      target.wins += mapStats.wins;
      target.battles += mapStats.battles;
    }
  }

  return merged;
}

export default function ReplayUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [section, setSection] = useState<'summary' | 'analytics'>('summary');
  const [minBattles, setMinBattles] = useState(1);
  const [mapMinBattles, setMapMinBattles] = useState(3);
  const [selectedMap, setSelectedMap] = useState('');
  const [playerSort, setPlayerSort] = useState<{ key: PlayerSortKey; direction: SortDirection }>({
    key: 'avgDamage',
    direction: 'descending',
  });

  const fileInputId = 'abs-replay-files';

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

        const response = await fetch('/api/analyze', {
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

        if (parsed.player_stats && Object.keys(parsed.player_stats).length > 0) {
          chunks.push(parsed);
        }
      }

      const merged = mergeAnalysisResults(chunks);
      if (!merged.player_stats || Object.keys(merged.player_stats).length === 0) {
        throw new Error('Не вдалося обробити реплеї. Перевірте вміст файлів.');
      }

      setResults(merged);
      setSection('summary');
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'Невідома помилка аналізу.');
    } finally {
      setIsLoading(false);
    }
  };

  const playerRows = useMemo<PlayerRow[]>(() => {
    if (!results) {
      return [];
    }

    const rows = Object.entries(results.player_stats).map(([name, stats]) => {
      const battleCount = stats.battles.length;
      return {
        name,
        battleCount,
        avgDamage: battleCount > 0 ? stats.total_damage / battleCount : 0,
        avgKills: battleCount > 0 ? stats.total_kills / battleCount : 0,
        avgAssisted: battleCount > 0 ? stats.total_assisted / battleCount : 0,
      };
    });

    const filtered = rows.filter((row) => row.battleCount >= minBattles);
    return [...filtered].sort((left, right) => {
      const key = playerSort.key;
      const leftValue = left[key];
      const rightValue = right[key];

      if (typeof leftValue === 'string' && typeof rightValue === 'string') {
        const compareResult = leftValue.localeCompare(rightValue, 'uk', { sensitivity: 'base' });
        return playerSort.direction === 'ascending' ? compareResult : -compareResult;
      }

      const numericResult = Number(leftValue) - Number(rightValue);
      return playerSort.direction === 'ascending' ? numericResult : -numericResult;
    });
  }, [results, minBattles, playerSort]);

  const mapRows = useMemo(() => {
    if (!results) {
      return [];
    }

    return Object.entries(results.map_stats)
      .map(([mapName, stats]) => ({
        mapName,
        battles: stats.battles,
        wins: stats.wins,
        winrate: stats.battles > 0 ? (stats.wins / stats.battles) * 100 : 0,
      }))
      .sort((left, right) => right.battles - left.battles);
  }, [results]);

  const mapPerformanceRows = useMemo<MapPerformanceRow[]>(() => {
    if (!results) {
      return [];
    }

    const mapAccumulator = new Map<string, { playerEntries: number; totalDamage: number; totalKills: number; totalAssisted: number }>();

    for (const stats of Object.values(results.player_stats)) {
      for (const battle of stats.battles) {
        const row =
          mapAccumulator.get(battle.map) ??
          {
            playerEntries: 0,
            totalDamage: 0,
            totalKills: 0,
            totalAssisted: 0,
          };

        row.playerEntries += 1;
        row.totalDamage += battle.damage;
        row.totalKills += battle.kills;
        row.totalAssisted += battle.assisted_damage;

        mapAccumulator.set(battle.map, row);
      }
    }

    return Object.entries(results.map_stats)
      .map(([mapName, mapStats]) => {
        const totals = mapAccumulator.get(mapName) ?? { playerEntries: 0, totalDamage: 0, totalKills: 0, totalAssisted: 0 };
        const battleCount = mapStats.battles;
        const playerCount = totals.playerEntries;
        return {
          mapName,
          battles: battleCount,
          avgDamage: playerCount > 0 ? totals.totalDamage / playerCount : 0,
          avgKills: playerCount > 0 ? totals.totalKills / playerCount : 0,
          avgAssisted: playerCount > 0 ? totals.totalAssisted / playerCount : 0,
        };
      })
      .sort((left, right) => right.avgDamage - left.avgDamage);
  }, [results]);

  const mapPlayerRows = useMemo<MapPlayerRow[]>(() => {
    if (!results) {
      return [];
    }

    const mapPlayerAccumulator = new Map<string, { mapName: string; playerName: string; battles: number; totalDamage: number; totalKills: number; totalAssisted: number }>();

    for (const [playerName, stats] of Object.entries(results.player_stats)) {
      for (const battle of stats.battles) {
        const key = `${battle.map}::${playerName}`;
        const row =
          mapPlayerAccumulator.get(key) ??
          {
            mapName: battle.map,
            playerName,
            battles: 0,
            totalDamage: 0,
            totalKills: 0,
            totalAssisted: 0,
          };

        row.battles += 1;
        row.totalDamage += battle.damage;
        row.totalKills += battle.kills;
        row.totalAssisted += battle.assisted_damage;
        mapPlayerAccumulator.set(key, row);
      }
    }

    return Array.from(mapPlayerAccumulator.values()).map((row) => ({
      mapName: row.mapName,
      playerName: row.playerName,
      battles: row.battles,
      avgDamage: row.battles > 0 ? row.totalDamage / row.battles : 0,
      avgKills: row.battles > 0 ? row.totalKills / row.battles : 0,
      avgAssisted: row.battles > 0 ? row.totalAssisted / row.battles : 0,
    }));
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

  const selectedMapTopPlayers = useMemo(() => {
    return mapPlayerRows
      .filter((row) => row.mapName === selectedMap && row.battles >= mapMinBattles)
      .sort((left, right) => right.avgDamage - left.avgDamage)
      .slice(0, 12);
  }, [mapMinBattles, mapPlayerRows, selectedMap]);

  const qualifiedMapPerformanceRows = useMemo(
    () => [...mapPerformanceRows].filter((row) => row.battles >= mapMinBattles).sort((left, right) => right.avgDamage - left.avgDamage),
    [mapPerformanceRows, mapMinBattles]
  );

  const bestDamageMap = qualifiedMapPerformanceRows[0] ?? null;
  const worstDamageMap = qualifiedMapPerformanceRows.length > 1 ? qualifiedMapPerformanceRows[qualifiedMapPerformanceRows.length - 1] : null;
  const bestWinrateMap =
    [...mapRows]
      .filter((row) => row.battles >= mapMinBattles)
      .sort((left, right) => right.winrate - left.winrate)[0] ?? null;

  const handleSort = (key: PlayerSortKey) => {
    setPlayerSort((current) => {
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

  return (
    <div className="space-y-6">
      <section className="glass-panel p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <h1 className="text-lg font-semibold text-white sm:text-xl">АБС реплеї</h1>
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
            {files.length > 0 ? `Обрано файлів: ${files.length}` : 'Завантажте .wotreplay файли для АБС аналізу'}
          </p>

          <button type="button" onClick={handleAnalyze} disabled={isLoading || files.length === 0} className="btn-primary w-full sm:ml-auto sm:w-auto">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {isLoading ? 'Аналіз...' : 'Почати аналіз'}
          </button>
        </div>
      </section>

      {error && (
        <section className="panel-muted border border-rose-300/35 p-4 text-sm text-rose-200">
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
        <section className="grid min-h-[34rem] grid-cols-1 gap-4 xl:grid-cols-5">
          <article className="glass-panel p-4 xl:col-span-2">
            <h2 className="mb-3 text-base font-semibold text-white">Карти (winrate)</h2>
            <div className="table-shell overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-100">
                <thead className="table-head">
                  <tr>
                    <th className="px-2.5 py-2">Карта</th>
                    <th className="px-2.5 py-2 text-center">Боів</th>
                    <th className="px-2.5 py-2 text-center">WR %</th>
                  </tr>
                </thead>
                <tbody>
                  {mapRows.map((row) => (
                    <tr key={row.mapName} className="table-row">
                      <td className="px-2.5 py-2">{row.mapName}</td>
                      <td className="px-2.5 py-2 text-center">{row.battles}</td>
                      <td className={`px-2.5 py-2 text-center font-semibold ${getWinrateColor(row.winrate)}`}>{row.winrate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="glass-panel p-4 xl:col-span-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">Гравці (середні метрики)</h2>
              <label className="flex items-center gap-2 text-xs text-slate-300 sm:text-sm">
                Мін. боїв
                <input
                  type="number"
                  min={1}
                  className="input w-16"
                  value={minBattles}
                  onChange={(event) => setMinBattles(Math.max(1, Number(event.target.value) || 1))}
                />
              </label>
            </div>

            <div className="table-shell overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-100">
                <thead className="table-head">
                  <tr>
                    <SortableHeader label="Гравець" onClick={() => handleSort('name')} />
                    <SortableHeader center label="Боів" onClick={() => handleSort('battleCount')} />
                    <SortableHeader center label="Сер. урон" onClick={() => handleSort('avgDamage')} />
                    <SortableHeader center label="Сер. кілли" onClick={() => handleSort('avgKills')} />
                    <SortableHeader center label="Сер. асист" onClick={() => handleSort('avgAssisted')} />
                  </tr>
                </thead>
                <tbody>
                  {playerRows.map((row) => (
                    <tr key={row.name} className="table-row">
                      <td className="px-2.5 py-2">{row.name}</td>
                      <td className="px-2.5 py-2 text-center">{row.battleCount}</td>
                      <td className={`px-2.5 py-2 text-center font-semibold ${getAvgDamageColor(row.avgDamage)}`}>{row.avgDamage.toFixed(0)}</td>
                      <td className="px-2.5 py-2 text-center">{row.avgKills.toFixed(2)}</td>
                      <td className="px-2.5 py-2 text-center">{row.avgAssisted.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {results && section === 'analytics' && (
        <section className="min-h-[34rem] space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <article className="kpi-card">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Краща карта за avg dmg</p>
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
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Ризикова карта</p>
              {worstDamageMap ? (
                <>
                  <p className="mt-2 text-lg font-semibold text-white">{worstDamageMap.mapName}</p>
                  <p className="mt-1 text-sm text-rose-200">{worstDamageMap.avgDamage.toFixed(0)} середній урон</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-300">Недостатньо даних</p>
              )}
            </article>

            <article className="kpi-card">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Кращий winrate</p>
              {bestWinrateMap ? (
                <>
                  <p className="mt-2 text-lg font-semibold text-white">{bestWinrateMap.mapName}</p>
                  <p className={`mt-1 text-sm ${getWinrateColor(bestWinrateMap.winrate)}`}>{bestWinrateMap.winrate.toFixed(1)}% WR</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-300">Недостатньо даних</p>
              )}
            </article>
          </div>

          <article className="glass-panel p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">Топ гравців на конкретній карті</h2>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedMap}
                  onChange={(event) => setSelectedMap(event.target.value)}
                  className="select min-w-[180px]"
                >
                  {mapRows.map((map) => (
                    <option key={map.mapName} value={map.mapName}>
                      {map.mapName}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-xs text-slate-300 sm:text-sm">
                  Мін. боїв
                  <input
                    type="number"
                    min={1}
                    className="input w-16"
                    value={mapMinBattles}
                    onChange={(event) => setMapMinBattles(Math.max(1, Number(event.target.value) || 1))}
                  />
                </label>
              </div>
            </div>

            <div className="table-shell overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-100">
                <thead className="table-head">
                  <tr>
                    <th className="px-2.5 py-2">#</th>
                    <th className="px-2.5 py-2">Гравець</th>
                    <th className="px-2.5 py-2 text-center">Боів</th>
                    <th className="px-2.5 py-2 text-center">Сер. урон</th>
                    <th className="px-2.5 py-2 text-center">Сер. кілли</th>
                    <th className="px-2.5 py-2 text-center">Сер. асист</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMapTopPlayers.map((row, index) => (
                    <tr key={`${row.mapName}-${row.playerName}`} className="table-row">
                      <td className="px-2.5 py-2">{index + 1}</td>
                      <td className="px-2.5 py-2">{row.playerName}</td>
                      <td className="px-2.5 py-2 text-center">{row.battles}</td>
                      <td className={`px-2.5 py-2 text-center font-semibold ${getAvgDamageColor(row.avgDamage)}`}>{row.avgDamage.toFixed(0)}</td>
                      <td className="px-2.5 py-2 text-center">{row.avgKills.toFixed(2)}</td>
                      <td className="px-2.5 py-2 text-center">{row.avgAssisted.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedMapTopPlayers.length === 0 && (
              <p className="mt-3 text-sm text-slate-300">
                Немає достатніх даних по карті. Спробуйте зменшити мінімальний поріг боїв.
              </p>
            )}
          </article>

          <article className="glass-panel p-4">
            <h3 className="mb-3 text-base font-semibold text-white">Топ карт по середньому урону команди</h3>
            <div className="table-shell overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-100">
                <thead className="table-head">
                  <tr>
                    <th className="px-2.5 py-2">Карта</th>
                    <th className="px-2.5 py-2 text-center">Боів</th>
                    <th className="px-2.5 py-2 text-center">Сер. урон</th>
                    <th className="px-2.5 py-2 text-center">Сер. кілли</th>
                    <th className="px-2.5 py-2 text-center">Сер. асист</th>
                  </tr>
                </thead>
                <tbody>
                  {mapPerformanceRows.slice(0, 10).map((row) => (
                    <tr key={row.mapName} className="table-row">
                      <td className="px-2.5 py-2">{row.mapName}</td>
                      <td className="px-2.5 py-2 text-center">{row.battles}</td>
                      <td className={`px-2.5 py-2 text-center font-semibold ${getAvgDamageColor(row.avgDamage)}`}>{row.avgDamage.toFixed(0)}</td>
                      <td className="px-2.5 py-2 text-center">{row.avgKills.toFixed(2)}</td>
                      <td className="px-2.5 py-2 text-center">{row.avgAssisted.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {results && section === 'summary' && playerRows.length > 0 && (
        <section className="panel-muted p-3 text-xs text-slate-300">
          Найпопулярніша техніка серед топ-гравців: {trimTankName(results.player_stats[playerRows[0].name]?.battles[0]?.tank ?? 'N/A')}
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
