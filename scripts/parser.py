# file: scripts/parser.py
import json
import zlib
import glob
from collections import defaultdict
import os
import sys
from typing import Union

# Функція find_all_json_in_binary залишається без змін
def find_all_json_in_binary(data: bytes) -> list:
    found_jsons = []
    i = 0
    while i < len(data):
        if data[i] == ord('{'):
            start_index = i
            brace_level = 1
            i += 1
            while i < len(data) and brace_level > 0:
                if data[i] == ord('{'):
                    brace_level += 1
                elif data[i] == ord('}'):
                    brace_level -= 1
                i += 1

            if brace_level == 0:
                json_str = data[start_index:i].decode('utf-8', errors='ignore')
                try:
                    found_jsons.append(json.loads(json_str))
                except json.JSONDecodeError:
                    pass
        else:
            i += 1
    return found_jsons

# Функція parse_single_replay залишається без змін
def parse_single_replay(replay_path: str) -> Union[tuple[str, list], tuple[None, None]]:
    try:
        with open(replay_path, 'rb') as f:
            try:
                replay_data = zlib.decompress(f.read()[8:])
            except zlib.error:
                f.seek(0)
                replay_data = f.read()
    except Exception:
        return None, None

    all_jsons = find_all_json_in_binary(replay_data)
    battle_metadata, battle_results = None, None

    for obj in all_jsons:
        if 'playerName' in obj and 'mapDisplayName' in obj and 'vehicles' in obj:
            if 'damageDealt' not in next(iter(obj['vehicles'].values()), {}):
                battle_metadata = obj

        if 'vehicles' in obj:
            first_vehicle = next(iter(obj.get('vehicles', {}).values()), None)
            if isinstance(first_vehicle, list) and first_vehicle and 'damageDealt' in first_vehicle[0]:
                battle_results = obj

    if not battle_metadata or not battle_results:
        return None, None

    map_name = battle_metadata.get('mapDisplayName', 'Невідома карта')
    main_player_name = battle_metadata.get('playerName')
    if not main_player_name:
        return None, None

    main_player_team = None
    vehicles_in_metadata = battle_metadata.get('vehicles', {})
    for vehicle_info in vehicles_in_metadata.values():
        if vehicle_info.get('name') == main_player_name:
            main_player_team = vehicle_info.get('team')
            break

    if not main_player_team:
        return None, None

    allied_team_stats = []
    vehicles_in_results = battle_results.get('vehicles', {})
    for vehicle_data_list in vehicles_in_results.values():
        if not vehicle_data_list: continue

        player_data = vehicle_data_list[0]
        if player_data.get('team') == main_player_team:
            assisted_track = player_data.get('damageAssistedTrack', 0)
            assisted_radio = player_data.get('damageAssistedRadio', 0)
            total_assisted = assisted_track + assisted_radio

            allied_team_stats.append({
                'name': player_data.get('name'),
                'damage': player_data.get('damageDealt', 0),
                'kills': player_data.get('kills', 0),
                'assisted_damage': total_assisted,
                'tank': player_data.get('vehicleType', 'N/A').split(':')[-1]
            })

    allies_in_metadata = [
        {'name': p.get('name'), 'tank': p.get('vehicleType', 'N/A').split(':')[-1]}
        for p in vehicles_in_metadata.values() if p.get('team') == main_player_team
    ]

    final_stats = []
    for i, stats_from_results in enumerate(allied_team_stats):
        if i < len(allies_in_metadata):
            stats_from_results['name'] = allies_in_metadata[i]['name']
            stats_from_results['tank'] = allies_in_metadata[i]['tank']

        if not stats_from_results['name']:
            stats_from_results['name'] = f"Гравець на {stats_from_results['tank']}"

        final_stats.append(stats_from_results)

    return map_name, final_stats

def process_replays_in_folder(folder_path: str):
    replay_files = glob.glob(os.path.join(folder_path, "*.wotreplay"))
    if not replay_files:
        return {}

    player_stats = defaultdict(lambda: {'battles': [],'total_damage': 0,'total_kills': 0,'total_assisted': 0})

    for replay_path in replay_files:
        map_name, allied_data = parse_single_replay(replay_path)
        if allied_data:
            for player in allied_data:
                player_name = player['name']
                player_stats[player_name]['battles'].append({'map': map_name,'tank': player['tank'],'damage': player['damage'],'kills': player['kills'],'assisted_damage': player['assisted_damage']})
                player_stats[player_name]['total_damage'] += player['damage']
                player_stats[player_name]['total_kills'] += player['kills']
                player_stats[player_name]['total_assisted'] += player['assisted_damage']

    return player_stats

if __name__ == "__main__":
    if len(sys.argv) > 1:
        folder_path = sys.argv[1]
        results = process_replays_in_folder(folder_path)
        # Виводимо результат як JSON в стандартний вивід
        print(json.dumps(results))