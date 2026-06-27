import math

def compute_void_distance(node1, node2, metadata):
    S = metadata['coordinate_scale_unit_km']
    dx = node1['x'] - node2['x']
    dy = node1['y'] - node2['y']
    center_dist = S * math.sqrt(dx*dx + dy*dy)
    L = center_dist - (node1['radius_km'] + node1['atmosphere_thickness_km']) - (node2['radius_km'] + node2['atmosphere_thickness_km'])
    return L

def compute_void_travel_time(node1, node2, L, metadata):
    C = metadata['speed_of_light_kms']
    h1 = node1['atmosphere_thickness_km']
    n1 = node1['refraction_index']
    h2 = node2['atmosphere_thickness_km']
    n2 = node2['refraction_index']
    Tv = ((h1 * n1 + h2 * n2 + L) / C) * 1000
    return Tv

def compute_crust_transit_time(planet, entry_tower, exit_tower, metadata):
    r = planet['radius_km']
    N = planet['active_towers']
    f = metadata['fiber_speed_fraction']
    C = metadata['speed_of_light_kms']
    dt = metadata['tower_processing_delay_ms']
    
    diff = abs(entry_tower - exit_tower)
    s = min(diff, N - diff)
    
    m = 1 if s == 0 else s + 1
    fiber_time = ((2 * math.pi * r * s) / (N * f * C)) * 1000
    Tp = fiber_time + m * dt
    return Tp

def find_closest_tower_pair(node1, node2):
    best_dist = float('inf')
    best = {'tower1Index': 0, 'tower2Index': 0}
    
    for t1 in node1['towers']:
        for t2 in node2['towers']:
            dx = t1['x'] - t2['x']
            dy = t1['y'] - t2['y']
            d = dx*dx + dy*dy
            if d < best_dist:
                best_dist = d
                best = {'tower1Index': t1['index'], 'tower2Index': t2['index']}
    return best
