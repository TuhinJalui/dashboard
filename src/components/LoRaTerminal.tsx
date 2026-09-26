import React, { useRef, useEffect } from 'react';
import { Terminal, Trash2 } from 'lucide-react';
import { LoRaPacketLog } from '../types';

interface LoRaTerminalProps {
  packets: LoRaPacketLog[];
  onClear: () => void;
}

export const LoRaTerminal: React.FC<LoRaTerminalProps> = ({ packets, onClear }) => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [packets]);

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title-group">
          <Terminal size={18} color="#10b981" />
          <h2 className="panel-title">LoRa Mesh Packet Inspector</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className="panel-badge">REAL-TIME PACKETS: {packets.length}</span>
          <button
            onClick={onClear}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Clear Log"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="lora-terminal" ref={terminalRef}>
        <div className="log-entry safe">
          <span className="log-time">[INIT]</span>
          <span className="log-node">GATEWAY</span>
          <span className="log-msg">LoRa multi-hop network monitoring online. Listening for node packets...</span>
        </div>

        {packets.map((pkt) => {
          const statusClass = pkt.status.toLowerCase();
          return (
            <div key={pkt.id} className={`log-entry ${statusClass}`}>
              <span className="log-time">[{pkt.timestamp}]</span>
              <span className="log-node">{pkt.source}</span>
              <span className="log-msg">
                » [{pkt.route}] | GPS: {pkt.gps} | Tilt: {pkt.payload.tilt.toFixed(2)}° | Gas: {pkt.payload.gas.toFixed(0)}ppm-eq | Load: {pkt.payload.load.toFixed(2)}kg | Risk: {pkt.payload.risk}/100
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
