# file: scripts/random_parser.py
import json
import zlib
import glob
from collections import defaultdict
import os
import sys
from typing import Union

def find_all_json_in_binary(data: bytes) -> list:
    found_jsons = []
    i = 0
    while i < len(data):
        if data[i] == ord('{'):
            start_index = i; brace_level = 1; i += 1
            while i < len(data) and brace_level > 0:
                if data[i] == ord('{'): brace_level += 1
                elif data[i] == ord('}'): brace_level -= 1
                i += 1
            if brace_level == 0:
                try: found_jsons.append(json.loads(data[start_index:i].decode('utf-8', 'ignore')))
                except: pass
        else: i += 1
    return found_jsons

def parse_single_replay(replay_path: str) -> Union[dict, None]:
    try:
        with open(replay_path, 'rb') as f:
            try: replay_data = zlib.decompress(f.read()[8:])
            except zlib.error: f.seek(0); replay_data = f.read()
    except Exception:
        return None

    all_jsons = find_all_json_in_binary(replay_data)
    battle_metadata, battle_results = None, None

    for obj in all_jsons:
        if 'playerName' in obj and 'mapDisplayName' in obj: battle_metadata = obj
        if 'personal' in obj and 'common' in obj: battle_results = obj; break

    if not battle_metadata or not battle_results:
        return None

    # --- ВИПРАВЛЕННЯ ДЛЯ НАЗВИ ТАНКА ---
    main_player_name = battle_metadata.get('playerName')
    main_player_tank = None
    vehicles_in_metadata = battle_metadata.get('vehicles', {})
    for vehicle_info in vehicles_in_metadata.values():
        if vehicle_info.get('name') == main_player_name:
            # Знаходимо танк гравця в метаданих, де він гарантовано є
            main_player_tank = vehicle_info.get('vehicleType', 'N/A').split(':')[-1]
            break

    if not main_player_tank: return None # Якщо танк не знайдено, реплей невалідний

    player_stats = None
    personal_block = battle_results.get('personal', {})
    if personal_block:
        for key, value in personal_block.items():
            if isinstance(value, dict) and 'damageDealt' in value:
                player_stats = value
                break

    if not player_stats: return None

    main_player_team = player_stats.get('team')
    common_data = battle_results.get('common', {})
    winner_team = common_data.get('winnerTeam', 0)

    outcome = 'draw'
    try:
        if int(winner_team) == int(main_player_team): outcome = 'win'
        elif int(winner_team) != 0: outcome = 'loss'
    except (ValueError, TypeError): outcome = 'draw'

    assisted_track = player_stats.get('damageAssistedTrack', 0)
    assisted_radio = player_stats.get('damageAssistedRadio', 0)
    survived = player_stats.get('deathReason', 0) == -1

    return {
        'map_name': battle_metadata.get('mapDisplayName', 'Невідома карта'),
        'tank': main_player_tank,
        'damage': player_stats.get('damageDealt', 0),
        'kills': player_stats.get('kills', 0),
        'assisted_damage': assisted_track + assisted_radio,
        'survived': survived,
        'outcome': outcome
    }

def process_replays_in_folder(folder_path: str):
    replay_files = glob.glob(os.path.join(folder_path, "*.wotreplay"))
    if not replay_files: return {}

    tank_stats = defaultdict(lambda: {
        'battles': 0, 'wins': 0, 'survived_count': 0,
        'total_damage': 0, 'total_kills': 0, 'total_assisted': 0,
        'maps': defaultdict(lambda: {
            'battles': 0, 'wins': 0, 'total_damage': 0, 'total_kills': 0, 'total_assisted': 0,
            'survived_count': 0 # --- ДОДАНО живучість для карт ---
        })
    })

    for replay_path in replay_files:
        data = parse_single_replay(replay_path)
        if data:
            tank_name = data['tank']
            map_name = data['map_name']

            tank_stats[tank_name]['battles'] += 1
            if data['outcome'] == 'win': tank_stats[tank_name]['wins'] += 1
            if data['survived']: tank_stats[tank_name]['survived_count'] += 1
            tank_stats[tank_name]['total_damage'] += data['damage']
            tank_stats[tank_name]['total_kills'] += data['kills']
            tank_stats[tank_name]['total_assisted'] += data['assisted_damage']

            tank_map_stats = tank_stats[tank_name]['maps'][map_name]
            tank_map_stats['battles'] += 1
            if data['outcome'] == 'win': tank_map_stats['wins'] += 1
            if data['survived']: tank_map_stats['survived_count'] += 1 # --- ДОДАНО живучість для карт ---
            tank_map_stats['total_damage'] += data['damage']
            tank_map_stats['total_kills'] += data['kills']
            tank_map_stats['total_assisted'] += data['assisted_damage']

    return tank_stats

if __name__ == "__main__":
    if len(sys.argv) > 1:
        folder_path = sys.argv[1]
        results = process_replays_in_folder(folder_path)
        print(json.dumps(results))