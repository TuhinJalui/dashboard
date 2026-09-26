import React from 'react';
import { Cpu, ShieldAlert, CheckCircle, AlertTriangle, ArrowDown, HelpCircle, TrendingUp, Navigation, AlertOctagon } from 'lucide-react';
import { AIAnalysisSummary } from '../types';

interface AiAdvisorPanelProps {
  analysis: AIAnalysisSummary;
}

export const AiAdvisorPanel: React.FC<AiAdvisorPanelProps> = ({ analysis }) => {
  const isDanger = analysis.status === 'DANGER';
  const isWarning = analysis.status === 'WARNING';

  return (
    <div className="panel-card ai-advisor-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <Cpu size={18} color="#06b6d4" />
          <h2 className="panel-title">AI Geotechnical Safety Advisor & Structural Reasoning</h2>
        </div>
        <span className="panel-badge">
          RATE: {analysis.subsidenceVelocityDegPerHr.toFixed(2)}°/hr
        </span>
      </div>

      {/* Firmware-First Pipeline Flow Banner (Point 10) */}
      <div className="ai-pipeline-banner">
        <span className="pipe-step">SENSORS</span>
        <span className="pipe-arrow">➔</span>
        <span className="pipe-step">FIRMWARE RISK LOGIC</span>
        <span className="pipe-arrow">➔</span>
        <span className="pipe-step">GATEWAY JSON</span>
        <span className="pipe-arrow">➔</span>
        <span className="pipe-step">DASHBOARD</span>
        <span className="pipe-arrow">➔</span>
        <span className="pipe-step active">AI ANALYSIS</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {/* Status Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: isDanger ? 'rgba(239, 68, 68, 0.15)' : isWarning ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.12)',
            border: `1px solid ${isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981'}`,
          }}
        >
          {isDanger ? (
            <ShieldAlert size={20} color="#ef4444" />
          ) : isWarning ? (
            <AlertTriangle size={20} color="#f59e0b" />
          ) : (
            <CheckCircle size={20} color="#10b981" />
          )}
          <span style={{ fontFamily: 'Chakra Petch', fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
            {analysis.headline}
          </span>
        </div>

        {/* 4 Core Q&A Cards (Point 10) */}
        <div className="ai-qa-grid">
          {/* Q1: Why is NODE-3 dangerous? */}
          <div className="ai-qa-card">
            <div className="qa-header">
              <HelpCircle size={14} color="#ef4444" />
              <span>Why is {analysis.criticalNodeId || 'this node'} dangerous?</span>
            </div>
            <div className="qa-body">
              {isDanger ? (
                <>
                  <strong>{analysis.criticalNodeId || 'NODE-3'}</strong> is currently classified as <strong>DANGER</strong> because{' '}
                  five monitored parameters are simultaneously at warning level: temperature, pressure, gas, tilt, and load.
                  The node is therefore operating at the highest monitoring frequency of 3 seconds.
                </>
              ) : isWarning ? (
                <>
                  {analysis.criticalNodeId || 'NODE-2'} is at <strong>WARNING</strong> because elevated gas indicators (8,500 ppm-eq)
                  were recorded. Telemetry cadence automatically increased to 15 seconds.
                </>
              ) : (
                <>All monitored nodes are in SAFE equilibrium within DGMS standards (&lt;3° tilt, &lt;5kg load, &lt;7500ppm gas).</>
              )}
            </div>
          </div>

          {/* Q2: Which node needs immediate attention? */}
          <div className="ai-qa-card">
            <div className="qa-header">
              <Navigation size={14} color="#38bdf8" />
              <span>Which node needs immediate attention?</span>
            </div>
            <div className="qa-body">
              {analysis.criticalNodeId ? (
                <>
                  Priority Station: <strong>{analysis.criticalNodeId}</strong> located at GPS coordinates{' '}
                  <strong>(19.054900, 73.069300)</strong> in Sector 3 Fault Shear Zone.
                  Acoustic direction-finding beacon is sounding on this node only.
                </>
              ) : (
                <>No priority evacuation required. Routine multi-hop monitoring active on all stations.</>
              )}
            </div>
          </div>

          {/* Q3: What parameters are changing? */}
          <div className="ai-qa-card">
            <div className="qa-header">
              <TrendingUp size={14} color="#f59e0b" />
              <span>What parameters are changing?</span>
            </div>
            <div className="qa-body">
              <ul style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {analysis.primaryRiskDrivers.map((driver, idx) => (
                  <li key={idx}>{driver}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Q4: Recommended Mine Action Plan */}
          <div className="ai-qa-card">
            <div className="qa-header">
              <AlertOctagon size={14} color="#10b981" />
              <span>Recommended DGMS Action Protocol:</span>
            </div>
            <div className="qa-body">
              <ul style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {analysis.recommendedAction.map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
