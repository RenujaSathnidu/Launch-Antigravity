import chaos
from physics import compute_void_distance, compute_void_travel_time

def find_route(origin, destination, universe, chaos_state=None):
    metadata = universe['metadata']
    nodes = universe['nodes']
    links = universe['links']
    
    state = chaos_state or chaos.get_state()
    killed_nodes = set(state['killedNodes'])
    killed_links = set(state['killedLinks'])
    
    if origin in killed_nodes or destination in killed_nodes:
        return None
        
    node_map = {n['id']: n for n in nodes}
    adj = {n['id']: [] for n in nodes if n['id'] not in killed_nodes}
    
    for link in links:
        a = link['source']
        b = link['target']
        if a in killed_nodes or b in killed_nodes:
            continue
            
        key = "-".join(sorted([a, b]))
        if key in killed_links:
            continue
            
        L = compute_void_distance(node_map[a], node_map[b], metadata)
        Tv = compute_void_travel_time(node_map[a], node_map[b], L, metadata)
        
        if a in adj: adj[a].append({'to': b, 'weight': Tv})
        if b in adj: adj[b].append({'to': a, 'weight': Tv})
        
    dist = {id: float('inf') for id in adj.keys()}
    if origin not in dist:
        return None
    dist[origin] = 0
    prev = {}
    visited = set()
    
    while True:
        u = None
        u_dist = float('inf')
        for id in adj.keys():
            if id not in visited and dist[id] < u_dist:
                u = id
                u_dist = dist[id]
                
        if u is None or u == destination:
            break
            
        visited.add(u)
        
        for edge in adj[u]:
            if edge['to'] in visited:
                continue
            alt = dist[u] + edge['weight']
            if alt < dist[edge['to']]:
                dist[edge['to']] = alt
                prev[edge['to']] = u
                
    if dist.get(destination, float('inf')) == float('inf'):
        return None
        
    path = []
    cur = destination
    while cur is not None:
        path.insert(0, cur)
        cur = prev.get(cur)
        
    return path
