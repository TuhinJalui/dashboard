import React from 'react';
import { ShieldAlert, Radio, Server, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { NodeData, AlarmState } from '../types';

interface MineOverviewBarProps {
  nodes: NodeData[];
  alarm: AlarmState;
  gatewayUrl: string;
  isWokwiLive: boolean;
  selectedNodeId: string | null;
  onSelectNode: (lat: number, lon: number, nodeId: string) => void;
}

export const MineOverviewBar: React.FC<MineOverviewBarProps> = ({
  nodes,
  alarm,
  gatewayUrl,
  isWokwiLive,
  selectedNodeId,
  onSelectNode,
}) => {
  const criticalCount = nodes.filter((n) => n.status === 'DANGER').length;
  const warningCount = nodes.filter((n) => n.status === 'WARNING').length;
  const safeCount = nodes.filter((n) => n.status === 'SAFE').length;

  return (
    <section className="mine-overview-bar">
      {/* Top Status Strip */}
      <div className="overview-headline-row">
        <div className="overview-title-group">
          <div className="overview-pulse-icon">
            <Activity size={20} className="pulse-cyan" />
          </div>
          <div>
            <h2 className="overview-title">MINE MONITORING SYSTEM</h2>
            <div className="overview-subtitle">
              REAL-TIME GEOTECHNICAL SUBSIDENCE & MULTI-HOP TELEMETRY MESH
            </div>
          </div>
        </div>

        {/* Global Network Counters */}
        <div className="overview-badges-cluster">
          <div className="status-chip total">
            <span className="chip-dot total" />
            <span>{nodes.length} Active Nodes</span>
          </div>

          <div className={`status-chip critical ${criticalCount > 0 ? 'flashing-red' : ''}`}>
            <span className="chip-dot critical" />
            <span>{criticalCount} Critical</span>
          </div>

          <div className="status-chip warning">
            <span className="chip-dot warning" />
            <span>{warningCount} Warning</span>
          </div>

          <div className="status-chip safe">
            <span className="chip-dot safe" />
            <span>{safeCount} Safe</span>
          </div>

          <div className={`status-chip gateway ${isWokwiLive ? 'online' : 'standby'}`}>
            <Server size={13} />
            <span>Gateway: {isWokwiLive ? 'ONLINE' : 'STANDBY'}</span>
          </div>

          <div className="status-chip lora">
            <Radio size={13} />
            <span>Network: LoRa Multi-Hop</span>
          </div>
        </div>
      </div>

      {/* Node Logical Status Strip: NODE-1 -> NODE-5 */}
      <div className="overview-nodes-chain">
        <div className="chain-label">
          <span>EXPECTED LOGICAL STATE:</span>
        </div>

        <div className="chain-nodes-row">
          {nodes.map((node, idx) => {
            const isSelected = node.node === selectedNodeId;
            const isDanger = node.status === 'DANGER';
            const isWarning = node.status === 'WARNING';
            const isGateway = node.node === 'NODE-5';
            const isHw = node.node === 'NODE-1';

            let stateDesc = 'SAFE';
            if (isDanger) stateDesc = 'DANGER (5 WARN)';
            else if (isWarning) stateDesc = 'WARNING (GAS)';
            else if (isGateway) stateDesc = 'SAFE + GATEWAY';
            else if (isHw) stateDesc = `${node.status} (REAL HW)`;

            const borderStyle = isDanger
              ? '1.5px solid #ef4444'
              : isWarning
                ? '1.5px solid #f59e0b'
                : '1.5px solid rgba(16, 185, 129, 0.4)';

            const glowStyle = isDanger
              ? '0 0 16px rgba(239, 68, 68, 0.4)'
              : isSelected
                ? '0 0 14px rgba(56, 189, 248, 0.5)'
                : 'none';

            return (
              <React.Fragment key={node.node}>
                <button
                  type="button"
                  className={`node-chain-chip ${isDanger ? 'danger' : isWarning ? 'warning' : 'safe'} ${isSelected ? 'selected' : ''
                    }`}
                  style={{ border: borderStyle, boxShadow: glowStyle }}
                  onClick={() => onSelectNode(node.latitude, node.longitude, node.node)}
                  title={`Click to focus ${node.node} across GIS map and strata`}
                >
                  <div className="chip-header">
                    <span className="chip-name">{node.node}</span>
                    <span className={`chip-badge ${node.status.toLowerCase()}`}>
                      {node.status}
                    </span>
                  </div>
                  <div className="chip-meta">{stateDesc}</div>
                  <div className="chip-footer">
                    <span>TX: {node.sample_interval_seconds}s</span>
                    <span>Risk: {node.risk_score}</span>
                  </div>
                </button>
                {idx < nodes.length - 1 && <span className="chain-arrow">➔</span>}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
};
