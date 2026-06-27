import json
import math
import os
from physics import compute_void_distance

config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'universe-config.json'))

with open(config_path, 'r', encoding='utf-8') as f:
    config = json.load(f)

metadata = config['universe_metadata']

def compute_towers(node):
    S = metadata['coordinate_scale_unit_km']
    cx = node['x'] * S
    cy = node['y'] * S
    N = node['active_towers']
    r = node['radius_km']
    towers = []
    
    for i in range(N):
        angle = (2 * math.pi * i) / N
        towers.append({
            'index': i,
            'x': cx + r * math.sin(angle),
            'y': cy + r * math.cos(angle)
        })
    return towers

nodes = []
for node in config['nodes']:
    n = dict(node)
    n['towers'] = compute_towers(n)
    nodes.append(n)

links = []
Lmax = metadata['max_void_hop_distance_km']
for i in range(len(nodes)):
    for j in range(i + 1, len(nodes)):
        L = compute_void_distance(nodes[i], nodes[j], metadata)
        if L <= Lmax:
            links.append({
                'source': nodes[i]['id'],
                'target': nodes[j]['id'],
                'void_distance_km': L
            })

def get_universe():
    return {
        'metadata': metadata,
        'nodes': nodes,
        'links': links
    }
