killed_nodes = set()
killed_links = set()

def kill_node(node_id):
    killed_nodes.add(node_id)

def kill_link(node_a, node_b):
    key = "-".join(sorted([node_a, node_b]))
    killed_links.add(key)

def restore():
    killed_nodes.clear()
    killed_links.clear()

def get_state():
    return {
        'killedNodes': list(killed_nodes),
        'killedLinks': list(killed_links)
    }
