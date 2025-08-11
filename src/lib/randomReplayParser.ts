// file: lib/randomReplayParser.ts
import fs from "fs";
import path from "path";
import zlib from "zlib";

type Outcome = "win" | "loss" | "draw";

type SingleReplay = {
    map_name: string;
    tank: string;
    damage: number;
    kills: number;
    assisted_damage: number;
    survived: boolean;
    outcome: Outcome;
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

// ---- мінімальні структури JSON, що нам потрібні ----
type VehicleMeta = {
    name?: string;
    team?: number | string;
    vehicleType?: string;
};

type BattleMetadata = {
    playerName?: string;
    mapDisplayName?: string;
    vehicles?: Record<string, VehicleMeta>;
};

type PersonalStats = {
    team?: number | string;
    damageDealt?: number;
    kills?: number;
    damageAssistedTrack?: number;
    damageAssistedRadio?: number;
    deathReason?: number;
};

type BattleResults = {
    personal?: Record<string, PersonalStats>;
    common?: { winnerTeam?: number | string };
};

// ---- type guards ----
function isRecord(x: unknown): x is Record<string, unknown> {
    return typeof x === "object" && x !== null;
}
function hasKeys<T extends string>(obj: unknown, keys: T[]): obj is Record<T, unknown> {
    if (!isRecord(obj)) return false;
    return keys.every((k) => k in obj);
}

function findAllJsonInBinary(data: Buffer): unknown[] {
    const found: unknown[] = [];
    let i = 0;
    const LBR = "{".charCodeAt(0);
    const RBR = "}".charCodeAt(0);

    while (i < data.length) {
        if (data[i] === LBR) {
            const start = i;
            let lvl = 1;
            i++;
            while (i < data.length && lvl > 0) {
                const b = data[i];
                if (b === LBR) lvl++;
                else if (b === RBR) lvl--;
                i++;
            }
            if (lvl === 0) {
                const slice = data.subarray(start, i);
                try {
                    const s = slice.toString("utf8");
                    found.push(JSON.parse(s) as unknown);
                } catch {
                    /* ignore */
                }
            }
        } else {
            i++;
        }
    }
    return found;
}

function safeDecompress(buf: Buffer): Buffer {
    const maybeZ = buf.subarray(8);
    try {
        return zlib.inflateSync(maybeZ);
    } catch {
        return buf;
    }
}

export function parseSingleReplay(replayPath: string): SingleReplay | null {
    let raw: Buffer;
    try {
        raw = fs.readFileSync(replayPath);
    } catch {
        return null;
    }

    const replayData = safeDecompress(raw);
    const all = findAllJsonInBinary(replayData);

    let battle_metadata: BattleMetadata | null = null;
    let battle_results: BattleResults | null = null;

    for (const obj of all) {
        if (isRecord(obj)) {
            if (hasKeys(obj, ["playerName", "mapDisplayName"])) {
                battle_metadata = obj as unknown as BattleMetadata;
            }
            if (hasKeys(obj, ["personal", "common"])) {
                battle_results = obj as unknown as BattleResults;
                break;
            }
        }
    }

    if (!battle_metadata || !battle_results) return null;

    // танк головного гравця з metadata
    const main_player_name: string | undefined = battle_metadata.playerName;
    let main_player_tank: string | null = null;

    const vehicles_meta = (battle_metadata.vehicles ?? {}) as Record<string, VehicleMeta>;
    for (const v of Object.values(vehicles_meta)) {
        if ((v?.name ?? "") === main_player_name) {
            const vt = v?.vehicleType ?? "N/A";
            main_player_tank = String(vt).split(":").pop() ?? "N/A";
            break;
        }
    }
    if (!main_player_tank) return null;

    // витягаємо персональні стати
    let player_stats: PersonalStats | null = null;
    const personal = (battle_results.personal ?? {}) as Record<string, PersonalStats>;
    for (const val of Object.values(personal)) {
        if (isRecord(val) && "damageDealt" in val) {
            player_stats = val as PersonalStats;
            break;
        }
    }
    if (!player_stats) return null;

    const main_player_team = Number(player_stats.team);
    const winner_team = Number(battle_results?.common?.winnerTeam ?? 0);
    let outcome: Outcome = "draw";
    if (!Number.isNaN(main_player_team)) {
        if (winner_team === main_player_team) outcome = "win";
        else if (winner_team !== 0) outcome = "loss";
    }

    const assisted_track = Number(player_stats.damageAssistedTrack ?? 0);
    const assisted_radio = Number(player_stats.damageAssistedRadio ?? 0);
    const survived = Number(player_stats.deathReason ?? 0) === -1;

    return {
        map_name: battle_metadata.mapDisplayName ?? "Невідома карта",
        tank: main_player_tank,
        damage: Number(player_stats.damageDealt ?? 0),
        kills: Number(player_stats.kills ?? 0),
        assisted_damage: assisted_track + assisted_radio,
        survived,
        outcome,
    };
}

export function processReplaysInFolder(folderPath: string): Record<string, TankAgg> {
    // збираємо всі .wotreplay
    let files: string[] = [];
    try {
        files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".wotreplay"));
    } catch {
        return {};
    }

    const tank_stats: Record<string, TankAgg> = {};

    for (const f of files) {
        const full = path.join(folderPath, f);
        const data = parseSingleReplay(full);
        if (!data) continue;

        const tankName = data.tank;
        const mapName = data.map_name;

        // init tank bucket
        if (!tank_stats[tankName]) {
            tank_stats[tankName] = {
                battles: 0,
                wins: 0,
                survived_count: 0,
                total_damage: 0,
                total_kills: 0,
                total_assisted: 0,
                maps: {},
            };
        }

        const t = tank_stats[tankName];
        t.battles += 1;
        if (data.outcome === "win") t.wins += 1;
        if (data.survived) t.survived_count += 1;
        t.total_damage += data.damage;
        t.total_kills += data.kills;
        t.total_assisted += data.assisted_damage;

        // init map bucket
        if (!t.maps[mapName]) {
            t.maps[mapName] = {
                battles: 0,
                wins: 0,
                survived_count: 0,
                total_damage: 0,
                total_kills: 0,
                total_assisted: 0,
            };
        }

        const m = t.maps[mapName];
        m.battles += 1;
        if (data.outcome === "win") m.wins += 1;
        if (data.survived) m.survived_count += 1;
        m.total_damage += data.damage;
        m.total_kills += data.kills;
        m.total_assisted += data.assisted_damage;
    }

    return tank_stats;
}
