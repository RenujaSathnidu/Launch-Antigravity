import { useState, useEffect, useCallback } from 'react';
import { fetchUniverse, sendMessage, killNode, killLink, restoreAll, getChaosState } from './utils/api';
import Starfield from './components/Starfield';
import UniverseCanvas from './components/UniverseCanvas';
import SendPanel from './components/SendPanel';
import HopLog from './components/HopLog';
import LatencyBreakdown from './components/LatencyBreakdown';
import ChaosPanel from './components/ChaosPanel';
import PacketInspector from './components/PacketInspector';
import SummaryReport from './components/SummaryReport';
import './App.css';

export default function App() {
  const [universe, setUniverse] = useState(null);
  const [chaosState, setChaosState] = useState({ killedNodes: [], killedLinks: [] });
  const [packetResult, setPacketResult] = useState(null);
  const [selectedOrigin, setSelectedOrigin] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [animationData, setAnimationData] = useState(null);
  const [activeHop, setActiveHop] = useState(-1);

  useEffect(() => {
    loadUniverse();
    loadChaosState();
  }, []);

  async function loadUniverse() {
    const { data, error } = await fetchUniverse();
    if (data) setUniverse(data);
    if (error) console.error('Failed to load universe:', error);
  }

  async function loadChaosState() {
    const { data } = await getChaosState();
    if (data) setChaosState(data);
  }

  const handleSend = useCallback(async (origin, destination, message) => {
    setError(null);
    setSending(true);
    setPacketResult(null);
    setAnimationData(null);
    setActiveHop(-1);

    const { data, error: err } = await sendMessage(origin, destination, message);
    setSending(false);

    if (err) {
      setError(err);
      return;
    }

    setPacketResult(data);
    setAnimationData({
      route: data.route,
      hopLog: data.hop_log,
      startTime: Date.now(),
    });
  }, []);

  const handleKillNode = useCallback(async (nodeId) => {
    const { data } = await killNode(nodeId);
    if (data?.state) setChaosState(data.state);
  }, []);

  const handleKillLink = useCallback(async (nodeA, nodeB) => {
    const { data } = await killLink(nodeA, nodeB);
    if (data?.state) setChaosState(data.state);
  }, []);

  const handleRestore = useCallback(async () => {
    const { data } = await restoreAll();
    if (data?.state) setChaosState(data.state);
  }, []);

  const handlePlanetClick = useCallback((planetId) => {
    if (!selectedOrigin || (selectedOrigin && selectedDestination)) {
      setSelectedOrigin(planetId);
      setSelectedDestination('');
    } else {
      if (planetId !== selectedOrigin) {
        setSelectedDestination(planetId);
      }
    }
  }, [selectedOrigin, selectedDestination]);

  if (!universe) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <h2>Initializing Zeta-26 System…</h2>
        <p>Loading universe configuration</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Starfield />

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="app-title-bar">
        <div>
          <h1>RELIC RING PROTOCOL</h1>
          <div className="subtitle">Zeta-26 Star System — Routing Simulator</div>
        </div>
      </div>

      {/* ── Top: Canvas + Sidebar ───────────────────────────────── */}
      <div className="top-section">
        <div className="canvas-section">
          <UniverseCanvas
            universe={universe}
            chaosState={chaosState}
            animationData={animationData}
            activeHop={activeHop}
            setActiveHop={setActiveHop}
            selectedOrigin={selectedOrigin}
            selectedDestination={selectedDestination}
            onPlanetClick={handlePlanetClick}
          />
        </div>

        <div className="panels-section">
          <SendPanel
            universe={universe}
            selectedOrigin={selectedOrigin}
            selectedDestination={selectedDestination}
            onOriginChange={setSelectedOrigin}
            onDestinationChange={setSelectedDestination}
            onSend={handleSend}
            sending={sending}
            error={error}
          />

          <LatencyBreakdown packetResult={packetResult} />

          <HopLog
            packetResult={packetResult}
            activeHop={activeHop}
          />

          <ChaosPanel
            universe={universe}
            chaosState={chaosState}
            onKillNode={handleKillNode}
            onKillLink={handleKillLink}
            onRestore={handleRestore}
          />

          <PacketInspector
            packetResult={packetResult}
            activeHop={activeHop}
          />
        </div>
      </div>

      {/* ── Bottom: Summary Report (scrollable) ─────────────────── */}
      {packetResult && (
        <SummaryReport packetResult={packetResult} />
      )}
    </div>
  );
}
