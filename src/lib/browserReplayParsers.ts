type Outcome = 'win' | 'loss' | 'draw';

type VehicleMeta = {
  name?: string;
  team?: number | string;
  vehicleType?: string;
};

type PlayerEntry = {
  name?: string;
  team?: number | string;
  damageDealt?: number;
  kills?: number;
  damageAssistedTrack?: number;
  damageAssistedRadio?: number;
  vehicleType?: string;
};

type PersonalStats = {
  team?: number | string;
  damageDealt?: number;
  kills?: number;
  damageAssistedTrack?: number;
  damageAssistedRadio?: number;
  deathReason?: number;
};

type BattleMetadata = {
  playerName?: string;
  mapDisplayName?: string;
  vehicles?: Record<string, VehicleMeta>;
};

type AbsBattleResults = {
  vehicles?: Record<string, PlayerEntry[]>;
  common?: { winnerTeam?: number | string };
};

type RandomBattleResults = {
  personal?: Record<string, PersonalStats>;
  common?: { winnerTeam?: number | string };
};

type AbsSingleReplay = {
  map_name: string;
  outcome: Outcome;
  allied_stats: {
    name: string;
    damage: number;
    kills: number;
    assisted_damage: number;
    tank: string;
  }[];
};

type RandomSingleReplay = {
  map_name: string;
  tank: string;
  damage: number;
  kills: number;
  assisted_damage: number;
  survived: boolean;
  outcome: Outcome;
};

export type AbsAnalysisResults = {
  player_stats: Record<
    string,
    {
      battles: { map: string; tank: string; damage: number; kills: number; assisted_damage: number }[];
      total_damage: number;
      total_kills: number;
      total_assisted: number;
    }
  >;
  map_stats: Record<string, { wins: number; battles: number }>;
};

type MapAgg = {
  battles: number;
  wins: number;
  survived_count: number;
  total_damage: number;
  total_kills: number;
  total_assisted: number;
};

type TankAgg = {
  battles: number;
  wins: number;
  survived_count: number;
  total_damage: number;
  total_kills: number;
  total_assisted: number;
  maps: Record<string, MapAgg>;
};

export type RandomAnalysisResults = Record<string, TankAgg>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasKeys<T extends string>(obj: unknown, keys: T[]): obj is Record<T, unknown> {
  if (!isRecord(obj)) return false;
  return keys.every((key) => key in obj);
}

function isBattleMetadata(obj: unknown): obj is BattleMetadata {
  return hasKeys(obj, ['playerName', 'mapDisplayName', 'vehicles']);
}

function isAbsBattleResults(obj: unknown): obj is AbsBattleResults {
  if (!hasKeys(obj, ['vehicles'])) return false;
  const vehicles = (obj as AbsBattleResults).vehicles;
  if (!isRecord(vehicles)) return false;
  const first = Object.values(vehicles)[0];
  return Array.isArray(first) && first.length > 0 && isRecord(first[0]) && 'damageDealt' in first[0];
}

async function decompressReplayData(rawBytes: Uint8Array): Promise<Uint8Array> {
  const bytes = rawBytes.subarray(8);
  if (typeof DecompressionStream === 'undefined') {
    return rawBytes;
  }

  try {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream('deflate'));
    const decompressed = await new Response(stream).arrayBuffer();
    return new Uint8Array(decompressed);
  } catch {
    return rawBytes;
  }
}

function findAllJsonInBinary(data: Uint8Array): unknown[] {
  const found: unknown[] = [];
  const leftBrace = '{'.charCodeAt(0);
  const rightBrace = '}'.charCodeAt(0);
  const decoder = new TextDecoder('utf-8');
  let index = 0;

  while (index < data.length) {
    if (data[index] === leftBrace) {
      const start = index;
      let level = 1;
      index += 1;

      while (index < data.length && level > 0) {
        const byte = data[index];
        if (byte === leftBrace) level += 1;
        else if (byte === rightBrace) level -= 1;
        index += 1;
      }

      if (level === 0) {
        try {
          const text = decoder.decode(data.subarray(start, index));
          found.push(JSON.parse(text) as unknown);
        } catch {
          // Ignore invalid JSON slices.
        }
      }
      continue;
    }

    index += 1;
  }

  return found;
}

async function parseAbsReplayFile(file: File): Promise<AbsSingleReplay | null> {
  let raw: Uint8Array;
  try {
    raw = new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }

  const replayData = await decompressReplayData(raw);
  const allObjects = findAllJsonInBinary(replayData);

  let metadata: BattleMetadata | null = null;
  let results: AbsBattleResults | null = null;

  for (const obj of allObjects) {
    if (isBattleMetadata(obj)) metadata = obj;
    else if (isAbsBattleResults(obj)) results = obj;
  }

  if (!metadata || !results) return null;

  const mapName = metadata.mapDisplayName ?? 'Unknown map';
  const playerName = metadata.playerName;
  if (!playerName) return null;

  let playerTeam: number | null = null;
  const vehiclesMeta = (metadata.vehicles ?? {}) as Record<string, VehicleMeta>;
  for (const vehicle of Object.values(vehiclesMeta)) {
    if ((vehicle.name ?? '') === playerName) {
      playerTeam = Number(vehicle.team);
      break;
    }
  }

  if (playerTeam == null || Number.isNaN(playerTeam)) return null;

  const winnerTeam = Number(results.common?.winnerTeam ?? 0) || 0;
  let outcome: Outcome = 'draw';
  if (winnerTeam === playerTeam) outcome = 'win';
  else if (winnerTeam !== 0) outcome = 'loss';

  const alliedStats: AbsSingleReplay['allied_stats'] = [];
  const vehiclesResults = (results.vehicles ?? {}) as Record<string, PlayerEntry[]>;
  for (const arr of Object.values(vehiclesResults)) {
    if (!Array.isArray(arr) || arr.length === 0) continue;
    const entry = arr[0];
    if (entry.team != null && Number(entry.team) === playerTeam) {
      const assisted = Number(entry.damageAssistedTrack ?? 0) + Number(entry.damageAssistedRadio ?? 0);
      alliedStats.push({
        name: entry.name ?? '',
        damage: Number(entry.damageDealt ?? 0),
        kills: Number(entry.kills ?? 0),
        assisted_damage: assisted,
        tank: String(entry.vehicleType ?? 'N/A').split(':').pop() ?? 'N/A',
      });
    }
  }

  const alliesMeta = Object.values(vehiclesMeta)
    .filter((vehicle) => Number(vehicle.team) === playerTeam)
    .map((vehicle) => ({
      name: vehicle.name ?? '',
      tank: String(vehicle.vehicleType ?? 'N/A').split(':').pop() ?? 'N/A',
    }));

  const finalStats = alliedStats.map((entry, idx) => {
    const merged = { ...entry };
    if (idx < alliesMeta.length) {
      merged.name = alliesMeta[idx].name || merged.name;
      merged.tank = alliesMeta[idx].tank || merged.tank;
    }
    if (!merged.name) merged.name = `Player in ${merged.tank}`;
    return merged;
  });

  return { map_name: mapName, outcome, allied_stats: finalStats };
}

async function parseRandomReplayFile(file: File): Promise<RandomSingleReplay | null> {
  let raw: Uint8Array;
  try {
    raw = new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }

  const replayData = await decompressReplayData(raw);
  const allObjects = findAllJsonInBinary(replayData);

  let metadata: BattleMetadata | null = null;
  let results: RandomBattleResults | null = null;

  for (const obj of allObjects) {
    if (!isRecord(obj)) continue;
    if (hasKeys(obj, ['playerName', 'mapDisplayName'])) {
      metadata = obj as BattleMetadata;
    }
    if (hasKeys(obj, ['personal', 'common'])) {
      results = obj as RandomBattleResults;
      break;
    }
  }

  if (!metadata || !results) return null;

  const playerName = metadata.playerName;
  let playerTank: string | null = null;
  const vehiclesMeta = (metadata.vehicles ?? {}) as Record<string, VehicleMeta>;
  for (const vehicle of Object.values(vehiclesMeta)) {
    if ((vehicle.name ?? '') === playerName) {
      playerTank = String(vehicle.vehicleType ?? 'N/A').split(':').pop() ?? 'N/A';
      break;
    }
  }
  if (!playerTank) return null;

  let playerStats: PersonalStats | null = null;
  const personal = (results.personal ?? {}) as Record<string, PersonalStats>;
  for (const value of Object.values(personal)) {
    if (isRecord(value) && 'damageDealt' in value) {
      playerStats = value;
      break;
    }
  }
  if (!playerStats) return null;

  const playerTeam = Number(playerStats.team);
  const winnerTeam = Number(results.common?.winnerTeam ?? 0);
  let outcome: Outcome = 'draw';
  if (!Number.isNaN(playerTeam)) {
    if (winnerTeam === playerTeam) outcome = 'win';
    else if (winnerTeam !== 0) outcome = 'loss';
  }

  return {
    map_name: metadata.mapDisplayName ?? 'Unknown map',
    tank: playerTank,
    damage: Number(playerStats.damageDealt ?? 0),
    kills: Number(playerStats.kills ?? 0),
    assisted_damage: Number(playerStats.damageAssistedTrack ?? 0) + Number(playerStats.damageAssistedRadio ?? 0),
    survived: Number(playerStats.deathReason ?? 0) === -1,
    outcome,
  };
}

export async function processAbsReplayFiles(
  files: File[],
  onProgress?: (processed: number, total: number) => void
): Promise<AbsAnalysisResults> {
  const player_stats: AbsAnalysisResults['player_stats'] = {};
  const map_stats: AbsAnalysisResults['map_stats'] = {};
  const total = files.length;

  for (let i = 0; i < files.length; i += 1) {
    const parsed = await parseAbsReplayFile(files[i]);
    if (parsed) {
      const { map_name, outcome, allied_stats } = parsed;
      map_stats[map_name] ??= { wins: 0, battles: 0 };
      map_stats[map_name].battles += 1;
      if (outcome === 'win') map_stats[map_name].wins += 1;

      for (const player of allied_stats) {
        const key = player.name;
        player_stats[key] ??= { battles: [], total_damage: 0, total_kills: 0, total_assisted: 0 };
        player_stats[key].battles.push({
          map: map_name,
          tank: player.tank,
          damage: player.damage,
          kills: player.kills,
          assisted_damage: player.assisted_damage,
        });
        player_stats[key].total_damage += player.damage;
        player_stats[key].total_kills += player.kills;
        player_stats[key].total_assisted += player.assisted_damage;
      }
    }

    onProgress?.(i + 1, total);
  }

  return { player_stats, map_stats };
}

export async function processRandomReplayFiles(
  files: File[],
  onProgress?: (processed: number, total: number) => void
): Promise<RandomAnalysisResults> {
  const tankStats: RandomAnalysisResults = {};
  const total = files.length;

  for (let i = 0; i < files.length; i += 1) {
    const parsed = await parseRandomReplayFile(files[i]);
    if (parsed) {
      const tankName = parsed.tank;
      const mapName = parsed.map_name;

      if (!tankStats[tankName]) {
        tankStats[tankName] = {
          battles: 0,
          wins: 0,
          survived_count: 0,
          total_damage: 0,
          total_kills: 0,
          total_assisted: 0,
          maps: {},
        };
      }

      const tank = tankStats[tankName];
      tank.battles += 1;
      if (parsed.outcome === 'win') tank.wins += 1;
      if (parsed.survived) tank.survived_count += 1;
      tank.total_damage += parsed.damage;
      tank.total_kills += parsed.kills;
      tank.total_assisted += parsed.assisted_damage;

      if (!tank.maps[mapName]) {
        tank.maps[mapName] = {
          battles: 0,
          wins: 0,
          survived_count: 0,
          total_damage: 0,
          total_kills: 0,
          total_assisted: 0,
        };
      }

      const map = tank.maps[mapName];
      map.battles += 1;
      if (parsed.outcome === 'win') map.wins += 1;
      if (parsed.survived) map.survived_count += 1;
      map.total_damage += parsed.damage;
      map.total_kills += parsed.kills;
      map.total_assisted += parsed.assisted_damage;
    }

    onProgress?.(i + 1, total);
  }

  return tankStats;
}
