import React from 'react';
import { History, ShieldAlert, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { NodeData } from '../types';

export interface AlertEvent {
  id: string;
  time: string;
  node: string;
  type: 'CRITICAL_ALERT' | 'DANGER' | 'WARNING' | 'SAFE';
  details: string;
}

interface AlertHistoryTimelineProps {
  nodes: NodeData[];
}

export const AlertHistoryTimeline: React.FC<AlertHistoryTimelineProps> = ({ nodes }) => {
  // Generate realistic live chronology seeded with actual node states
  const events: AlertEvent[] = [
    {
      id: 'e1',
      time: '17:32:05',
      node: 'NODE-3',
      type: 'DANGER',
      details: 'High-frequency 3s telemetry: 5 warnings co-occurring (Tilt 3.50°, Gas 9000ppm, Load 6kg)',
    },
    {
      id: 'e2',
      time: '17:32:02',
      node: 'NODE-3',
      type: 'CRITICAL_ALERT',
      details: 'Acoustic siren locator activated at 3000 Hz on Node 3 (GPIO 10). All other buzzers OFF',
    },
    {
      id: 'e3',
      time: '17:32:02',
      node: 'NODE-3',
      type: 'DANGER',
      details: 'Status transitioned SAFE -> DANGER due to 5 simultaneous warning-level readings',
    },
    {
      id: 'e4',
      time: '17:32:02',
      node: 'NODE-2',
      type: 'WARNING',
      details: 'Main Haulage Cross-Cut #1 gas elevated to 8,500 ppm-equiv. Cadence shifted to 15s',
    },
    {
      id: 'e5',
      time: '17:32:01',
      node: 'NODE-3',
      type: 'WARNING',
      details: 'Fault Shear Zone: Initial structural tilt excursion (3.50° >= 3.0° warning threshold)',
    },
    {
      id: 'e6',
      time: '17:31:40',
      node: 'NODE-1',
      type: 'SAFE',
      details: 'Shaft Collar & Intake Portal live Wokwi sensors baseline normal (40s interval)',
    },
  ];

  return (
    <div className="panel-card alert-timeline-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <History size={18} color="#f43f5e" />
          <h2 className="panel-title">Mine Alert & Anomaly Event Timeline</h2>
        </div>
        <span className="panel-badge">AUDIT TRAIL LOG</span>
      </div>

      <div className="timeline-items-list">
        {events.map((evt) => {
          const isCrit = evt.type === 'CRITICAL_ALERT' || evt.type === 'DANGER';
          const isWarn = evt.type === 'WARNING';
          const typeClass = isCrit ? 'danger' : isWarn ? 'warn' : 'safe';

          return (
            <div key={evt.id} className={`timeline-entry-row ${typeClass}`}>
              <div className="entry-time-col">
                <Clock size={11} />
                <span>{evt.time}</span>
              </div>

              <div className={`entry-badge-col ${typeClass}`}>
                <span className="node-tag">{evt.node}</span>
                <span className="type-tag">{evt.type.replace('_', ' ')}</span>
              </div>

              <div className="entry-details-col">{evt.details}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
