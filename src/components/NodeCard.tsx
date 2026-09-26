import React from 'react';
import { MapPin, BatteryCharging, Radio, Volume2, Activity, ShieldAlert, Cpu } from 'lucide-react';
import { NodeData } from '../types';

interface NodeCardProps {
  node: NodeData;
  isSelected: boolean;
  onFocusMap: (lat: number, lon: number, nodeId: string) => void;
}

export const NodeCard: React.FC<NodeCardProps> = ({ node, isSelected, onFocusMap }) => {
  const isDanger = node.status === 'DANGER';
  const isWarning = node.status === 'WARNING';

  const cardClass = isDanger ? 'state-danger' : isWarning ? 'state-warning' : 'state-safe';
  const pillClass = node.status.toLowerCase();
  const fillClass = isDanger ? 'danger' : isWarning ? 'warn' : 'safe';

  const states = node.sensorStates || {
    gas: 'NORMAL',
    temperature: 'NORMAL',
    pressure: 'NORMAL',
    tilt: 'NORMAL',
    load: 'NORMAL',
  };

  const isHardware = node.node === 'NODE-1';
  const isGateway = node.node === 'NODE-5';
  const roleLabel = isHardware
    ? 'REAL WOKWI SENSORS'
    : isGateway
    ? 'GATEWAY NODE'
    : node.role || 'VIRTUAL TELEMETRY';

  // Pressure drop % calculation
  const baseline = node.pressureBaseline || 101325;
  const dropPct = (((baseline - node.pressure) / baseline) * 100).toFixed(1);

  // Adaptive TX Interval text
  const txBadge =
    node.sample_interval_seconds === 3
      ? '⚡ 3 sec (HIGH FREQUENCY)'
      : node.sample_interval_seconds === 15
      ? '15 sec (INCREASED)'
      : '40 sec (NORMAL BASELINE)';

  return (
    <div
      className={`node-card-advanced ${cardClass} ${isSelected ? 'selected' : ''}`}
      onClick={() => onFocusMap(node.latitude, node.longitude, node.node)}
    >
      {/* 1. Header with Node ID, Role & Status Pill */}
      <div className="card-top-bar">
        <div className="card-id-block">
          <div className="card-title-row">
            <span className="card-node-id">{node.node}</span>
            {isGateway && <span className="gateway-indicator-tag">GATEWAY</span>}
            {isHardware && <span className="hardware-indicator-tag">LIVE HARDWARE</span>}
            {isSelected && <span className="selected-tag">SELECTED</span>}
          </div>
          <div className="card-role-text">{roleLabel}</div>
        </div>

        <div className="card-status-badge-wrapper">
          <span className={`node-status-pill ${pillClass}`}>{node.status}</span>
        </div>
      </div>

      {/* 2. Risk Score & Adaptive TX Strip */}
      <div className="card-risk-tx-strip">
        <div className="risk-score-box">
          <div className="risk-score-header">
            <span className="risk-lbl">RISK SCORE</span>
            <span className="risk-num">{node.risk_score} / 100</span>
          </div>
          <div className="risk-track">
            <div className={`risk-bar ${fillClass}`} style={{ width: `${Math.max(5, node.risk_score)}%` }} />
          </div>
        </div>

        <div className={`tx-interval-badge ${node.sample_interval_seconds === 3 ? 'emergency' : ''}`}>
          <Radio size={12} />
          <span>TX: {txBadge}</span>
        </div>
      </div>

      {/* 3. Sensor Counts: Warning vs Critical (Point 2 & 3) */}
      <div className="sensor-counts-banner">
        <span className="count-pill warn">
          ⚠️ Warnings: <strong>{node.warning_sensors}</strong>
        </span>
        <span className="count-pill crit">
          🛑 Critical: <strong>{node.critical_sensors}</strong>
        </span>
        <span className="count-pill pkts">
          <Activity size={11} /> {node.packets_sent} pkts sent
        </span>
      </div>

      {/* 4. Sensor Section: Environment & Structural with states beside each (Point 4) */}
      <div className="sensors-grouped-container">
        {/* Environment Group */}
        <div className="sensor-category">
          <div className="cat-title">ENVIRONMENT</div>
          <div className="sensor-rows-list">
            {/* Temperature */}
            <div className={`sensor-item-row ${states.temperature !== 'NORMAL' ? 'warn' : ''}`}>
              <span className="s-label">Temperature</span>
              <span className="s-val">{node.temperature.toFixed(1)} °C</span>
              <span className={`s-state ${states.temperature === 'CRITICAL_SENSOR' ? 'crit' : states.temperature === 'WARNING_SENSOR' ? 'warn' : 'norm'}`}>
                {states.temperature === 'CRITICAL_SENSOR' ? 'CRITICAL' : states.temperature === 'WARNING_SENSOR' ? 'WARNING' : 'NORMAL'}
              </span>
            </div>

            {/* Humidity */}
            <div className="sensor-item-row">
              <span className="s-label">Humidity</span>
              <span className="s-val">{node.humidity.toFixed(1)} %</span>
              <span className="s-state norm">NORMAL</span>
            </div>

            {/* Pressure */}
            <div className={`sensor-item-row ${states.pressure !== 'NORMAL' ? 'warn' : ''}`}>
              <span className="s-label">Pressure (-{dropPct}%)</span>
              <span className="s-val">{node.pressure.toFixed(0)} Pa</span>
              <span className={`s-state ${states.pressure === 'CRITICAL_SENSOR' ? 'crit' : states.pressure === 'WARNING_SENSOR' ? 'warn' : 'norm'}`}>
                {states.pressure === 'CRITICAL_SENSOR' ? 'CRITICAL' : states.pressure === 'WARNING_SENSOR' ? 'WARNING' : 'NORMAL'}
              </span>
            </div>

            {/* Gas */}
            <div className={`sensor-item-row ${states.gas !== 'NORMAL' ? 'warn' : ''}`}>
              <span className="s-label">Gas Concentration</span>
              <span className="s-val">{node.gas_ppm_equiv.toFixed(0)} ppm-eq</span>
              <span className={`s-state ${states.gas === 'CRITICAL_SENSOR' ? 'crit' : states.gas === 'WARNING_SENSOR' ? 'warn' : 'norm'}`}>
                {states.gas === 'CRITICAL_SENSOR' ? 'CRITICAL' : states.gas === 'WARNING_SENSOR' ? 'WARNING' : 'NORMAL'}
              </span>
            </div>
          </div>
        </div>

        {/* Structural Group */}
        <div className="sensor-category">
          <div className="cat-title">STRUCTURAL</div>
          <div className="sensor-rows-list">
            {/* Tilt */}
            <div className={`sensor-item-row ${states.tilt !== 'NORMAL' ? 'warn' : ''}`}>
              <span className="s-label">Inclinometer Tilt</span>
              <span className="s-val">{node.tilt_deg.toFixed(2)}°</span>
              <span className={`s-state ${states.tilt === 'CRITICAL_SENSOR' ? 'crit' : states.tilt === 'WARNING_SENSOR' ? 'warn' : 'norm'}`}>
                {states.tilt === 'CRITICAL_SENSOR' ? 'CRITICAL' : states.tilt === 'WARNING_SENSOR' ? 'WARNING' : 'NORMAL'}
              </span>
            </div>

            {/* Load */}
            <div className={`sensor-item-row ${states.load !== 'NORMAL' ? 'warn' : ''}`}>
              <span className="s-label">Roof Strata Load</span>
              <span className="s-val">{node.load_kg.toFixed(2)} kg</span>
              <span className={`s-state ${states.load === 'CRITICAL_SENSOR' ? 'crit' : states.load === 'WARNING_SENSOR' ? 'warn' : 'norm'}`}>
                {states.load === 'CRITICAL_SENSOR' ? 'CRITICAL' : states.load === 'WARNING_SENSOR' ? 'WARNING' : 'NORMAL'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. GPS & Battery Footer (Point 8) */}
      <div className="card-bottom-footer">
        <div className="gps-loc-chip" title="Click to view on Map">
          <MapPin size={12} color="#06b6d4" />
          <span>{node.latitude.toFixed(6)}, {node.longitude.toFixed(6)}</span>
        </div>

        <div className="battery-chip" title="Simulated power depletion model">
          <BatteryCharging size={12} color={node.battery_percent > 60 ? '#10b981' : '#f59e0b'} />
          <span>Simulated Battery: {node.battery_percent.toFixed(1)}%</span>
        </div>

        <div className={`buzzer-badge ${node.buzzerActive ? 'buzzer-on' : 'buzzer-off'}`}>
          <Volume2 size={12} />
          <span>{node.buzzerActive ? '🚨 3kHz Siren Active' : 'Siren Standby'}</span>
        </div>
      </div>
    </div>
  );
};
