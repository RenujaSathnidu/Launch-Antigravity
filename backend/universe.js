// universe.js — Loads universe-config.json and computes tower positions + valid links

const path = require('path');
const fs = require('fs');
const { computeVoidDistance } = require('./physics');

const configPath = path.resolve(__dirname, '..', 'universe-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const metadata = config.universe_metadata;

/**
 * Compute tower positions for a node.
 * N towers placed at equal angular intervals, starting from +y (top), going CLOCKWISE.
 *
 * angle_i = (2π × i) / N   (clockwise from +y)
 * tower_x = center_x + radius_km × sin(angle_i)
 * tower_y = center_y + radius_km × cos(angle_i)
 *
 * Where center_x = node.x × coordinate_scale_unit_km
 *       center_y = node.y × coordinate_scale_unit_km
 */
function computeTowers(node) {
  const S = metadata.coordinate_scale_unit_km;
  const cx = node.x * S;
  const cy = node.y * S;
  const N = node.active_towers;
  const r = node.radius_km;
  const towers = [];

  for (let i = 0; i < N; i++) {
    const angle = (2 * Math.PI * i) / N; // clockwise from +y
    towers.push({
      index: i,
      x: cx + r * Math.sin(angle),
      y: cy + r * Math.cos(angle),
    });
  }

  return towers;
}

/**
 * Build enriched node objects with tower positions attached.
 */
function buildNodes() {
  return config.nodes.map(node => ({
    ...node,
    towers: computeTowers(node),
  }));
}

/**
 * Build list of valid links between all node pairs where void distance ≤ max_void_hop_distance_km.
 */
function buildLinks(nodes) {
  const Lmax = metadata.max_void_hop_distance_km;
  const links = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const L = computeVoidDistance(nodes[i], nodes[j], metadata);
      if (L <= Lmax) {
        links.push({
          source: nodes[i].id,
          target: nodes[j].id,
          void_distance_km: L,
        });
      }
    }
  }

  return links;
}

// Pre-compute once at startup
const nodes = buildNodes();
const links = buildLinks(nodes);

/**
 * Returns the full universe state.
 */
function getUniverse() {
  return {
    metadata,
    nodes,
    links,
  };
}

module.exports = { getUniverse };
