// server.js — Express server for the Relic Ring Protocol backend

const express = require('express');
const cors = require('cors');
const path = require('path');
const { getUniverse } = require('./universe');
const { findRoute } = require('./router');
const { buildPacket } = require('./packet');
const chaos = require('./chaos');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// ── API Routes ─────────────────────────────────────────────────────────

/**
 * GET /api/universe
 * Returns the full universe state: nodes (with tower positions), links, metadata.
 */
app.get('/api/universe', (req, res) => {
  res.json(getUniverse());
});

/**
 * POST /api/send
 * Body: { origin, destination, message }
 * Returns the full packet with hop_log, latency breakdown, codex translations.
 */
app.post('/api/send', (req, res) => {
  const { origin, destination, message } = req.body;

  if (!origin || !destination || !message) {
    return res.status(400).json({ error: 'Missing required fields: origin, destination, message' });
  }

  const universe = getUniverse();

  // Verify nodes exist
  const nodeIds = universe.nodes.map(n => n.id);
  if (!nodeIds.includes(origin)) {
    return res.status(400).json({ error: `Unknown origin node: ${origin}` });
  }
  if (!nodeIds.includes(destination)) {
    return res.status(400).json({ error: `Unknown destination node: ${destination}` });
  }

  if (origin === destination) {
    return res.status(400).json({ error: 'Origin and destination must be different' });
  }

  // Find route (chaos-aware)
  const chaosState = chaos.getState();
  const route = findRoute(origin, destination, universe, chaosState);

  if (!route) {
    return res.status(503).json({
      error: 'Undeliverable',
      detail: 'No viable route exists between origin and destination (nodes/links may be down).',
    });
  }

  // Build full packet
  const packet = buildPacket(origin, destination, message, route, universe);
  res.json(packet);
});

// ── Chaos Routes ───────────────────────────────────────────────────────

/**
 * POST /api/chaos/kill-node
 * Body: { nodeId }
 */
app.post('/api/chaos/kill-node', (req, res) => {
  const { nodeId } = req.body;
  if (!nodeId) return res.status(400).json({ error: 'Missing nodeId' });

  const universe = getUniverse();
  const nodeIds = universe.nodes.map(n => n.id);
  if (!nodeIds.includes(nodeId)) {
    return res.status(400).json({ error: `Unknown node: ${nodeId}` });
  }

  chaos.killNode(nodeId);
  res.json({ success: true, message: `Node ${nodeId} killed`, state: chaos.getState() });
});

/**
 * POST /api/chaos/kill-link
 * Body: { nodeA, nodeB }
 */
app.post('/api/chaos/kill-link', (req, res) => {
  const { nodeA, nodeB } = req.body;
  if (!nodeA || !nodeB) return res.status(400).json({ error: 'Missing nodeA or nodeB' });

  const universe = getUniverse();
  const nodeIds = universe.nodes.map(n => n.id);
  if (!nodeIds.includes(nodeA) || !nodeIds.includes(nodeB)) {
    return res.status(400).json({ error: `Unknown node in link: ${nodeA}-${nodeB}` });
  }

  chaos.killLink(nodeA, nodeB);
  res.json({ success: true, message: `Link ${nodeA}-${nodeB} killed`, state: chaos.getState() });
});

/**
 * POST /api/chaos/restore
 * Restores all killed nodes and links.
 */
app.post('/api/chaos/restore', (req, res) => {
  chaos.restore();
  res.json({ success: true, message: 'All nodes and links restored', state: chaos.getState() });
});

/**
 * GET /api/chaos/state
 * Returns current chaos state (killed nodes and links).
 */
app.get('/api/chaos/state', (req, res) => {
  res.json(chaos.getState());
});

// ── Serve Frontend in Production ───────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.resolve(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// ── Start ──────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 Relic Ring Protocol backend running on http://localhost:${PORT}`);
});
