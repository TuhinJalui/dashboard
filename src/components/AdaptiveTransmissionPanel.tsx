import React from 'react';
import { Radio, Zap, BatteryCharging, ShieldAlert } from 'lucide-react';
import { NodeData } from '../types';

interface AdaptiveTransmissionPanelProps {
  nodes: NodeData[];
  onSelectNode: (lat: number, lon: number, nodeId: string) => void;
}

export const AdaptiveTransmissionPanel: React.FC<AdaptiveTransmissionPanelProps> = ({
  nodes,
  onSelectNode,
}) => {
  return (
    <div className="panel-card adaptive-tx-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <Zap size={18} color="#eab308" />
          <h2 className="panel-title">Dynamic Adaptive Transmission Strategy</h2>
        </div>
        <span className="panel-badge">PATENTED FIRMWARE RATE CONTROLLER</span>
      </div>

      <div className="adaptive-desc-banner">
        <div className="desc-item safe">
          <span className="desc-dot safe" />
          <strong>SAFE (40 sec):</strong> Power conservation & baseline reporting
        </div>
        <div className="desc-item warn">
          <span className="desc-dot warn" />
          <strong>WARNING (15 sec):</strong> Elevated sampling & proactive vigilance
        </div>
        <div className="desc-item danger">
          <span className="desc-dot danger" />
          <strong>DANGER (3 sec):</strong> High-frequency rapid emergency telemetry
        </div>
      </div>

      <div className="adaptive-nodes-grid">
        {nodes.map((node) => {
          const isDanger = node.status === 'DANGER';
          const isWarning = node.status === 'WARNING';
          const interval = node.sample_interval_seconds;

          return (
            <div
              key={node.node}
              className={`adaptive-node-card ${isDanger ? 'danger' : isWarning ? 'warning' : 'safe'}`}
              onClick={() => onSelectNode(node.latitude, node.longitude, node.node)}
            >
              <div className="card-top">
                <span className="node-id">{node.node}</span>
                <span className={`status-tag ${node.status.toLowerCase()}`}>{node.status}</span>
              </div>

              <div className="tx-big-value">
                {isDanger && <span className="bolt-icon">⚡</span>}
                <span className="num">{interval}</span>
                <span className="unit">sec</span>
              </div>

              <div className="tx-strategy-label">
                {isDanger
                  ? 'HIGH FREQUENCY MONITORING'
                  : isWarning
                  ? 'INCREASED CADENCE'
                  : 'BATTERY-SAVING CADENCE'}
              </div>

              <div className="tx-sub-meta">
                <span>Packets: {node.packets_sent}</span>
                <span>Batt: {node.battery_percent.toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
