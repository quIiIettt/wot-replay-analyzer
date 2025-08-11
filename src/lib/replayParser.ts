// file: lib/replayParser.ts
import fs from "fs";
import path from "path";
import zlib from "zlib";

type AlliedStat = {
    name: string;
    damage: number;
    kills: number;
    assisted_damage: number;
    tank: string;
};

type ParseResult = {
    map_name: string;
    outcome: "win" | "loss" | "draw";
    allied_stats: AlliedStat[];
} | null;

type PlayerAgg = {
    battles: { map: string; tank: string; damage: number; kills: number; assisted_damage: number }[];
    total_damage: number;
    total_kills: number;
    total_assisted: number;
};

type ProcessResult = {
    player_stats: Record<string, PlayerAgg>;
    map_stats: Record<string, { wins: number; battles: number }>;
};

// ---- JSON мінімальні типи ----
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

type PlayerEntry = {
    name?: string;
    team?: number | string;
    damageDealt?: number;
    kills?: number;
    damageAssistedTrack?: number;
    damageAssistedRadio?: number;
    vehicleType?: string;
};
type BattleResults = {
    vehicles?: Record<string, PlayerEntry[]>;
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
function isBattleMetadata(obj: unknown): obj is BattleMetadata {
    return hasKeys(obj, ["playerName", "mapDisplayName", "vehicles"]);
}
function isBattleResults(obj: unknown): obj is BattleResults {
    if (!hasKeys(obj, ["vehicles"])) return false;
    const vehicles = (obj as BattleResults).vehicles!;
    const first = Object.values(vehicles)[0];
    return Array.isArray(first) && first.length > 0 && "damageDealt" in (first[0] as PlayerEntry);
}

function findAllJsonInBinary(data: Buffer): unknown[] {
    const found: unknown[] = [];
    let i = 0;
    const LBR = "{".charCodeAt(0);
    const RBR = "}".charCodeAt(0);

    while (i < data.length) {
        if (data[i] === LBR) {
            const start = i;
            let level = 1;
            i++;
            while (i < data.length && level > 0) {
                const ch = data[i];
                if (ch === LBR) level++;
                else if (ch === RBR) level--;
                i++;
            }
            if (level === 0) {
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

function safeDecompress(buffer: Buffer): Buffer {
    const maybeZlib = buffer.subarray(8);
    try {
        return zlib.inflateSync(maybeZlib);
    } catch {
        return buffer;
    }
}

export function parseSingleReplay(replayPath: string): ParseResult {
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
        if (isBattleMetadata(obj)) battle_metadata = obj;
        else if (isBattleResults(obj)) {
            battle_results = obj;
            // не break: інколи metadata може йти після results; але якщо хочеш — можна break;
        }
    }

    if (!battle_metadata || !battle_results) return null;

    const map_name: string = battle_metadata.mapDisplayName ?? "Невідома карта";
    const main_player_name: string | undefined = battle_metadata.playerName;
    if (!main_player_name) return null;

    // команда головного гравця
    let main_player_team: number | null = null;
    const vehicles_meta = (battle_metadata.vehicles ?? {}) as Record<string, VehicleMeta>;
    for (const v of Object.values<VehicleMeta>(vehicles_meta)) {
        if ((v.name ?? "") === main_player_name) {
            main_player_team = Number(v.team);
            break;
        }
    }
    if (main_player_team == null || Number.isNaN(main_player_team)) return null;

    // переможець
    const winner_team_raw = battle_results?.common?.winnerTeam ?? 0;
    const winner_team = Number(winner_team_raw) || 0;
    let outcome: "win" | "loss" | "draw" = "draw";
    if (winner_team === main_player_team) outcome = "win";
    else if (winner_team !== 0) outcome = "loss";

    // союзники з results
    const allied_team_stats: AlliedStat[] = [];
    const vehicles_results = (battle_results.vehicles ?? {}) as Record<string, PlayerEntry[]>;
    for (const arr of Object.values<PlayerEntry[]>(vehicles_results)) {
        if (!Array.isArray(arr) || arr.length === 0) continue;
        const p = arr[0] as PlayerEntry;
        if (p.team != null && Number(p.team) === main_player_team) {
            const assisted = Number(p.damageAssistedTrack ?? 0) + Number(p.damageAssistedRadio ?? 0);
            const tank = String(p.vehicleType ?? "N/A").split(":").pop()!;
            allied_team_stats.push({
                name: p.name ?? "",
                damage: Number(p.damageDealt ?? 0),
                kills: Number(p.kills ?? 0),
                assisted_damage: assisted,
                tank,
            });
        }
    }

    // підміняємо імена/танки з metadata по індексу
    const allies_in_meta = Object.values<VehicleMeta>(vehicles_meta)
        .filter((x) => Number(x.team) === main_player_team)
        .map((p) => ({
            name: p.name ?? "",
            tank: String(p.vehicleType ?? "N/A").split(":").pop()!,
        }));

    const final_stats: AlliedStat[] = allied_team_stats.map((s, i) => {
        const copy = { ...s };
        if (i < allies_in_meta.length) {
            copy.name = allies_in_meta[i].name || copy.name;
            copy.tank = allies_in_meta[i].tank || copy.tank;
        }
        if (!copy.name) copy.name = `Гравець на ${copy.tank}`;
        return copy;
    });

    return { map_name, outcome, allied_stats: final_stats };
}

export function processReplaysInFolder(folderPath: string): ProcessResult {
    const files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".wotreplay"));
    const player_stats: Record<string, PlayerAgg> = {};
    const map_stats: Record<string, { wins: number; battles: number }> = {};

    for (const f of files) {
        const full = path.join(folderPath, f);
        const parsed = parseSingleReplay(full);
        if (!parsed) continue;

        const { map_name, outcome, allied_stats } = parsed;

        map_stats[map_name] ??= { wins: 0, battles: 0 };
        map_stats[map_name].battles += 1;
        if (outcome === "win") map_stats[map_name].wins += 1;

        for (const p of allied_stats) {
            const key = p.name;
            player_stats[key] ??= { battles: [], total_damage: 0, total_kills: 0, total_assisted: 0 };
            player_stats[key].battles.push({
                map: map_name,
                tank: p.tank,
                damage: p.damage,
                kills: p.kills,
                assisted_damage: p.assisted_damage,
            });
            player_stats[key].total_damage += p.damage;
            player_stats[key].total_kills += p.kills;
            player_stats[key].total_assisted += p.assisted_damage;
        }
    }

    return { player_stats, map_stats };
}
