// packet.js — Builds the full packet object tracing a message through the route

const {
  computeVoidDistance,
  computeVoidTravelTime,
  computeCrustTransitTime,
  findClosestTowerPair,
} = require('./physics');
const { encodePayload } = require('./codex');

/**
 * Build the full packet object describing a message's journey through the route.
 *
 * @param {string}   origin      — origin node id
 * @param {string}   destination — destination node id
 * @param {string}   message     — plaintext message
 * @param {string[]} route       — ordered array of node IDs
 * @param {object}   universe    — { metadata, nodes, links }
 * @returns {object} the full packet with hop_log, latencies, codex translations
 */
function buildPacket(origin, destination, message, route, universe) {
  const { metadata, nodes } = universe;

  // Build a lookup map for nodes
  const nodeMap = {};
  for (const node of nodes) {
    nodeMap[node.id] = node;
  }

  const hopLog = [];
  let totalLatency = 0;

  // Track the tower index on the current planet where the packet currently sits.
  // For the origin planet, we'll set this when we determine the sending tower.
  let prevSendingTower = null; // tower index on the previous planet used to send into the void

  for (let i = 0; i < route.length; i++) {
    const planetId = route[i];
    const planet = nodeMap[planetId];
    const isOrigin = i === 0;
    const isDestination = i === route.length - 1;

    let receivingTower = null;  // tower index where packet arrives on this planet
    let sendingTower = null;    // tower index where packet departs this planet
    let voidInfo = null;
    let fiberSegments = 0;

    // ── Determine receiving tower ──────────────────────────────────────
    if (!isOrigin) {
      // The packet arrives from the previous planet.
      // The receiving tower on this planet is determined by the closest tower pair
      // between the previous planet and this planet.
      const prevPlanet = nodeMap[route[i - 1]];
      const pair = findClosestTowerPair(prevPlanet, planet);
      receivingTower = pair.tower2Index;
    }

    // ── Determine sending tower ────────────────────────────────────────
    if (!isDestination) {
      // The packet will depart to the next planet.
      // The sending tower is determined by the closest tower pair between
      // this planet and the next planet.
      const nextPlanet = nodeMap[route[i + 1]];
      const pair = findClosestTowerPair(planet, nextPlanet);
      sendingTower = pair.tower1Index;
    }

    // ── Compute void info from previous planet ─────────────────────────
    if (!isOrigin) {
      const prevPlanet = nodeMap[route[i - 1]];
      const L = computeVoidDistance(prevPlanet, planet, metadata);
      const Tv = computeVoidTravelTime(prevPlanet, planet, L, metadata);

      const C = metadata.speed_of_light_kms;
      const atmosDelayOrigin =
        (prevPlanet.atmosphere_thickness_km * prevPlanet.refraction_index) / C * 1000;
      const atmosDelayDest =
        (planet.atmosphere_thickness_km * planet.refraction_index) / C * 1000;

      voidInfo = {
        distance_km: parseFloat(L.toFixed(4)),
        travel_time_ms: parseFloat(Tv.toFixed(4)),
        atmosphere_delay_origin_ms: parseFloat(atmosDelayOrigin.toFixed(4)),
        atmosphere_delay_dest_ms: parseFloat(atmosDelayDest.toFixed(4)),
      };

      totalLatency += Tv;
    }

    // ── Compute fiber transit (crust) ──────────────────────────────────
    let fiberTransitMs = 0;
    let towerDelayMs = 0;

    if (isOrigin) {
      // Origin planet: entry tower = sending tower (m=1, s=0)
      const entryTower = sendingTower;
      const exitTower = sendingTower;
      const Tp = computeCrustTransitTime(planet, entryTower, exitTower, metadata);
      fiberTransitMs = 0; // s=0 means no fiber travel
      towerDelayMs = metadata.tower_processing_delay_ms; // m=1
      fiberSegments = 0;
    } else if (isDestination) {
      // Destination planet: only receiving tower matters, no sending.
      // The packet arrives at the receiving tower. m=1, s=0.
      fiberTransitMs = 0;
      towerDelayMs = metadata.tower_processing_delay_ms; // m=1
      fiberSegments = 0;
    } else {
      // Intermediate planet: packet goes from receiving tower to sending tower.
      const N = planet.active_towers;
      const diff = Math.abs(receivingTower - sendingTower);
      const s = Math.min(diff, N - diff);
      const m = s === 0 ? 1 : s + 1;

      const r = planet.radius_km;
      const f = metadata.fiber_speed_fraction;
      const C = metadata.speed_of_light_kms;
      const dt = metadata.tower_processing_delay_ms;

      fiberTransitMs = ((2 * Math.PI * r * s) / (N * f * C)) * 1000;
      towerDelayMs = m * dt;
      fiberSegments = s;
    }

    const totalPlanetMs = fiberTransitMs + towerDelayMs;
    totalLatency += totalPlanetMs;

    // ── Codex encoding ─────────────────────────────────────────────────
    // Encode the payload in the NEXT hop's codex base.
    // If this is the destination, encode in the destination's own codex.
    let encodedBase;
    if (isDestination) {
      encodedBase = planet.codex;
    } else {
      encodedBase = nodeMap[route[i + 1]].codex;
    }

    const encodedValues = encodePayload(message, encodedBase);

    // ── Build hop entry ────────────────────────────────────────────────
    const hop = {
      hop_index: i,
      planet_id: planetId,
      planet_codex: planet.codex,
      receiving_tower: receivingTower,
      sending_tower: sendingTower,
      fiber_segments: fiberSegments,
      payload_ascii: message,
      payload_encoded: {
        base: encodedBase,
        values: encodedValues,
      },
    };

    if (voidInfo) {
      hop.void_from_previous = voidInfo;
    }

    hop.latency = {
      fiber_transit_ms: parseFloat(fiberTransitMs.toFixed(4)),
      tower_delay_ms: parseFloat(towerDelayMs.toFixed(4)),
      total_planet_ms: parseFloat(totalPlanetMs.toFixed(4)),
    };

    hopLog.push(hop);
    prevSendingTower = sendingTower;
  }

  return {
    origin_id: origin,
    destination_id: destination,
    message,
    route,
    total_latency_ms: parseFloat(totalLatency.toFixed(4)),
    hop_log: hopLog,
  };
}

module.exports = { buildPacket };
