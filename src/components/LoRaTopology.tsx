import React from 'react';
import { Radio, ArrowRight, Server, Laptop, Wifi } from 'lucide-react';
import { NodeData } from '../types';

interface LoRaTopologyProps {
  nodes: NodeData[];
  selectedNodeId: string | null;
  onSelectNode: (lat: number, lon: number, nodeId: string) => void;
}

export const LoRaTopology: React.FC<LoRaTopologyProps> = ({ nodes, selectedNodeId, onSelectNode }) => {
  return (
    <div className="panel-card lora-topology-card">
      <div className="panel-header">
        <div className="panel-title-group">
          <Radio size={18} color="#3b82f6" />
          <h2 className="panel-title">LoRa Multi-Hop Mesh Network Visualization</h2>
        </div>
        <span className="panel-badge">GATEWAY: NODE-5 (ESP32-S3)</span>
      </div>

      {/* Logical Multi-Hop Route (Point 6) */}
      <div className="lora-route-flow-container">
        <div className="route-flow-label">
          LOGICAL MULTI-HOP TELEMETRY PROPAGATION ROUTE:
        </div>

        <div className="route-flow-chain">
          {nodes.map((node, index) => {
            const isDanger = node.status === 'DANGER';
            const isWarning = node.status === 'WARNING';
            const isGateway = node.node === 'NODE-5';
            const isSelected = node.node === selectedNodeId;

            let roleName = 'INTRICATE MESH';
            if (node.node === 'NODE-1') roleName = 'REAL WOKWI HW';
            else if (isGateway) roleName = 'NODE-5 GATEWAY';
            else if (isDanger) roleName = 'EMERGENCY 3s';
            else if (isWarning) roleName = 'GAS WARN 15s';

            return (
              <React.Fragment key={node.node}>
                <div
                  className={`mesh-node-box ${isDanger ? 'danger' : isWarning ? 'warning' : 'safe'} ${
                    isSelected ? 'selected' : ''
                  }`}
                  onClick={() => onSelectNode(node.latitude, node.longitude, node.node)}
                  title={`Click to focus ${node.node}`}
                >
                  <div className="node-id-txt">{node.node}</div>
                  <div className="node-role-txt">{roleName}</div>
                  <div className="node-status-txt">
                    <span className={`status-pill ${node.status.toLowerCase()}`}>{node.status}</span>
                  </div>
                  <div className="node-tx-txt">TX: {node.sample_interval_seconds}s</div>
                </div>

                <div className="hop-connector">
                  <div className={`signal-wave ${isDanger ? 'active-rapid' : 'active-normal'}`} />
                  <ArrowRight size={14} className="hop-arrow-icon" />
                </div>
              </React.Fragment>
            );
          })}

          {/* Gateway -> Dashboard */}
          <div className="mesh-gateway-box">
            <Server size={18} color="#38bdf8" />
            <div className="gw-title">NODE-5 GATEWAY</div>
            <div className="gw-ip">http://localhost:8180</div>
          </div>

          <div className="hop-connector">
            <ArrowRight size={14} className="hop-arrow-icon" />
          </div>

          <div className="mesh-dashboard-box">
            <Laptop size={18} color="#10b981" />
            <div className="db-title">DASHBOARD</div>
            <div className="db-port">Port 5173</div>
          </div>
        </div>
      </div>

      {/* Active Transmission Highlight Banner (Point 6) */}
      <div className="active-packet-highlight">
        <div className="highlight-pill">
          <Wifi size={14} className="pulse-cyan" />
          <span>
            ACTIVE ROUTE HIGHLIGHT: <strong>NODE-3 ─────► NODE-4 ─────► NODE-5 (GATEWAY) ─────► DASHBOARD</strong>
          </span>
        </div>
        <div className="highlight-note">
          ⚠️ <em>Prototype Note:</em> In this Wokwi simulation, this LoRa multi-hop behavior is software-emulated in firmware across the 5 logical node state-machines, feeding the Node-5 WebServer /api/nodes.
        </div>
      </div>
    </div>
  );
};
