// chaos.js — Chaos engineering state: kill / restore nodes and links

const killedNodes = new Set();
const killedLinks = new Set();

/**
 * Build a canonical key for a link so that (A,B) and (B,A) are identical.
 */
function linkKey(a, b) {
  return [a, b].sort().join('-');
}

function killNode(nodeId) {
  killedNodes.add(nodeId);
}

function killLink(nodeA, nodeB) {
  killedLinks.add(linkKey(nodeA, nodeB));
}

function restore() {
  killedNodes.clear();
  killedLinks.clear();
}

function isNodeAlive(nodeId) {
  return !killedNodes.has(nodeId);
}

function isLinkAlive(nodeA, nodeB) {
  return !killedLinks.has(linkKey(nodeA, nodeB));
}

function getState() {
  return {
    killedNodes: Array.from(killedNodes),
    killedLinks: Array.from(killedLinks),
  };
}

module.exports = { killNode, killLink, restore, isNodeAlive, isLinkAlive, getState };
