// router.js — Dijkstra shortest-latency routing with chaos awareness

const { computeVoidDistance, computeVoidTravelTime, findClosestTowerPair } = require('./physics');
const chaos = require('./chaos');

/**
 * Find the shortest-latency route between origin and destination using Dijkstra.
 *
 * Edge weight = Void Travel Time (Tv) between connected planets.
 * Only edges where void distance ≤ Lmax are considered.
 * Killed nodes and links (from chaos module) are excluded.
 *
 * @param {string} origin       — node id
 * @param {string} destination  — node id
 * @param {object} universe     — { metadata, nodes, links }
 * @param {object} chaosState   — { killedNodes: [], killedLinks: [] } (optional, reads from chaos module if not provided)
 * @returns {string[]|null} array of node IDs in order, or null if undeliverable
 */
function findRoute(origin, destination, universe, chaosState) {
  const { metadata, nodes, links } = universe;
  const state = chaosState || chaos.getState();

  const killedNodes = new Set(state.killedNodes);
  const killedLinks = new Set(state.killedLinks);

  // Quick check — are origin or destination alive?
  if (killedNodes.has(origin) || killedNodes.has(destination)) return null;

  // Build adjacency list with Tv weights
  const nodeMap = {};
  for (const node of nodes) {
    nodeMap[node.id] = node;
  }

  const adj = {};
  for (const node of nodes) {
    if (!killedNodes.has(node.id)) {
      adj[node.id] = [];
    }
  }

  for (const link of links) {
    const a = link.source;
    const b = link.target;

    if (killedNodes.has(a) || killedNodes.has(b)) continue;

    const sortedKey = [a, b].sort().join('-');
    if (killedLinks.has(sortedKey)) continue;

    // Compute Tv
    const L = computeVoidDistance(nodeMap[a], nodeMap[b], metadata);
    const Tv = computeVoidTravelTime(nodeMap[a], nodeMap[b], L, metadata);

    if (adj[a]) adj[a].push({ to: b, weight: Tv });
    if (adj[b]) adj[b].push({ to: a, weight: Tv });
  }

  // Dijkstra
  const dist = {};
  const prev = {};
  const visited = new Set();

  for (const id of Object.keys(adj)) {
    dist[id] = Infinity;
  }
  dist[origin] = 0;

  while (true) {
    // Pick unvisited node with smallest distance
    let u = null;
    let uDist = Infinity;
    for (const id of Object.keys(adj)) {
      if (!visited.has(id) && dist[id] < uDist) {
        u = id;
        uDist = dist[id];
      }
    }

    if (u === null) break; // no reachable unvisited nodes
    if (u === destination) break; // found shortest path

    visited.add(u);

    for (const edge of adj[u]) {
      if (visited.has(edge.to)) continue;
      const alt = dist[u] + edge.weight;
      if (alt < dist[edge.to]) {
        dist[edge.to] = alt;
        prev[edge.to] = u;
      }
    }
  }

  if (dist[destination] === Infinity) return null;

  // Reconstruct path
  const path = [];
  let cur = destination;
  while (cur !== undefined) {
    path.unshift(cur);
    cur = prev[cur];
  }

  return path;
}

module.exports = { findRoute };
