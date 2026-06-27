// physics.js — All physics calculations for the Relic Ring Protocol

/**
 * Compute Void Distance (L) between two nodes in km.
 *
 * L = S × sqrt((x1 - x2)² + (y1 - y2)²) - (R1 + h1) - (R2 + h2)
 *
 * @param {object} node1 — { x, y, radius_km, atmosphere_thickness_km, … }
 * @param {object} node2
 * @param {object} metadata — { coordinate_scale_unit_km, … }
 * @returns {number} L in km
 */
function computeVoidDistance(node1, node2, metadata) {
  const S = metadata.coordinate_scale_unit_km;
  const dx = node1.x - node2.x;
  const dy = node1.y - node2.y;
  const centerDistance = S * Math.sqrt(dx * dx + dy * dy);
  const L =
    centerDistance -
    (node1.radius_km + node1.atmosphere_thickness_km) -
    (node2.radius_km + node2.atmosphere_thickness_km);
  return L;
}

/**
 * Compute Void Travel Time (Tv) in milliseconds.
 *
 * Tv = ((h1 × n1) + (h2 × n2) + L) / C × 1000
 *
 * @param {object} node1
 * @param {object} node2
 * @param {number} L — void distance in km (output of computeVoidDistance)
 * @param {object} metadata — { speed_of_light_kms }
 * @returns {number} Tv in ms
 */
function computeVoidTravelTime(node1, node2, L, metadata) {
  const C = metadata.speed_of_light_kms;
  const h1 = node1.atmosphere_thickness_km;
  const n1 = node1.refraction_index;
  const h2 = node2.atmosphere_thickness_km;
  const n2 = node2.refraction_index;

  const Tv = ((h1 * n1 + h2 * n2 + L) / C) * 1000;
  return Tv;
}

/**
 * Compute Internal Crust Transit Time (Tp) in milliseconds.
 *
 * Tp = (2 × π × r × s) / (N × f × C) × 1000  +  m × Δt
 *
 * Where:
 *   r = radius_km of planet
 *   N = active_towers
 *   s = number of arc segments between entry and exit tower (shortest path)
 *   f = fiber_speed_fraction
 *   C = speed_of_light_kms
 *   m = number of distinct towers hit
 *       m = s + 1 in general
 *       m = 1 when entry tower = exit tower
 *   Δt = tower_processing_delay_ms
 *
 * @param {object} planet — { radius_km, active_towers, … }
 * @param {number} entryTower — tower index
 * @param {number} exitTower  — tower index
 * @param {object} metadata
 * @returns {number} Tp in ms
 */
function computeCrustTransitTime(planet, entryTower, exitTower, metadata) {
  const r = planet.radius_km;
  const N = planet.active_towers;
  const f = metadata.fiber_speed_fraction;
  const C = metadata.speed_of_light_kms;
  const dt = metadata.tower_processing_delay_ms;

  // Shortest arc around the ring
  const diff = Math.abs(entryTower - exitTower);
  const s = Math.min(diff, N - diff); // number of arc segments

  // Distinct towers hit
  const m = s === 0 ? 1 : s + 1;

  // Fiber travel time along s arc segments
  const fiberTime = ((2 * Math.PI * r * s) / (N * f * C)) * 1000;

  // Total
  const Tp = fiberTime + m * dt;
  return Tp;
}

/**
 * Find the closest tower pair between two nodes.
 * Minimises straight-line Euclidean distance between tower positions.
 *
 * @param {object} node1 — must have .towers[] with { x, y } positions
 * @param {object} node2
 * @returns {{ tower1Index: number, tower2Index: number }}
 */
function findClosestTowerPair(node1, node2) {
  let bestDist = Infinity;
  let best = { tower1Index: 0, tower2Index: 0 };

  for (let i = 0; i < node1.towers.length; i++) {
    for (let j = 0; j < node2.towers.length; j++) {
      const dx = node1.towers[i].x - node2.towers[j].x;
      const dy = node1.towers[i].y - node2.towers[j].y;
      const d = dx * dx + dy * dy; // no need for sqrt — comparison only
      if (d < bestDist) {
        bestDist = d;
        best = { tower1Index: i, tower2Index: j };
      }
    }
  }

  return best;
}

module.exports = {
  computeVoidDistance,
  computeVoidTravelTime,
  computeCrustTransitTime,
  findClosestTowerPair,
};
