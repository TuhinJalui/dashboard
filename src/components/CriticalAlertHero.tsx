import React from 'react';
import { AlertTriangle, MapPin, Radio, Volume2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { AlarmState } from '../types';

interface CriticalAlertHeroProps {
  alarm: AlarmState;
  onFocusMap: (lat: number, lon: number, nodeId: string) => void;
}

export const CriticalAlertHero: React.FC<CriticalAlertHeroProps> = ({ alarm, onFocusMap }) => {
  const { mode, activeNode } = alarm;

  if (mode === 'SAFE' || !activeNode) {
    return null;
  }

  const isDanger = mode === 'DANGER';
  const isMultiWarningDanger = isDanger && activeNode.warning_sensors >= 3 && activeNode.critical_sensors === 0;

  return (
    <section className={`alert-hero-master ${!isDanger ? 'warning-theme' : 'danger-theme'}`}>
      <div className="alert-hero-header-banner">
        <div className="alert-badge-group">
          <span className="emergency-badge">
            <AlertTriangle size={16} />
            {isDanger ? 'CRITICAL EVACUATION PROTOCOL' : 'MINE PRE-HAZARD WARNING'}
          </span>
          <span className="buzzer-status-pill">
            <Volume2 size={15} />
            {isDanger
              ? `ACTIVE AUDIBLE LOCATOR: ${activeNode.node} ONLY (3000 Hz Continuous Siren on GPIO 10)`
              : `ACOUSTIC SIREN: STANDBY (Active strictly on Critical/Danger)`}
          </span>
        </div>

        <div className="alert-meta-right">
          <span className="firmware-tag">FIRMWARE DECISION ENGINE: VANGUARD-S3</span>
        </div>
      </div>

      <div className="alert-main-content">
        {/* Giant Headline */}
        <div className="alert-hero-title">
          <span className="alert-icon-giant">🚨</span>
          <div>
            <h1>CRITICAL ALERT — {activeNode.node}</h1>
            <div className="alert-headline-subtitle">
              Multiple abnormal conditions detected simultaneously
            </div>
          </div>
        </div>

        {/* 5 Prominent Core Parameters Strip */}
        <div className="alert-core-grid">
          <div className="alert-core-card primary-danger">
            <span className="core-label">RISK SCORE</span>
            <span className="core-val">{activeNode.risk_score} / 100</span>
            <span className="core-sub">Elevated via Collective Warning Model</span>
          </div>

          <div className="alert-core-card">
            <span className="core-label">GPS LOCATION</span>
            <span className="core-val mono">
              {activeNode.latitude.toFixed(6)}, {activeNode.longitude.toFixed(6)}
            </span>
            <span className="core-sub">Sector 3 Fault Shear Extraction Zone</span>
          </div>

          <div className="alert-core-card highlight-cyan">
            <span className="core-label">TRANSMISSION CADENCE</span>
            <span className="core-val">
              <Radio size={15} style={{ display: 'inline', marginRight: '6px' }} />
              Every {activeNode.sample_interval_seconds} seconds
            </span>
            <span className="core-sub">⚡ Adaptive High-Frequency Emergency Rate</span>
          </div>

          <div className="alert-core-card warn-count">
            <span className="core-label">WARNING SENSOR COUNT</span>
            <span className="core-val text-amber">{activeNode.warning_sensors}</span>
            <span className="core-sub">5 Parameters at Warning Level</span>
          </div>

          <div className="alert-core-card crit-count">
            <span className="core-label">CRITICAL SENSOR COUNT</span>
            <span className="core-val text-slate">{activeNode.critical_sensors}</span>
            <span className="core-sub">0 Individual Critical Crossings</span>
          </div>
        </div>

        {/* Essential Rule Breakdown: WHY? */}
        <div className="alert-why-box">
          <div className="why-box-header">
            <span className="why-badge">GEOTECHNICAL ANOMALY CAUSE ANALYSIS</span>
            <span className="why-rule">
              FIRMWARE RULE: IF (critical_sensors &gt; 0) OR (warning_sensors &gt;= 3) → STATUS = DANGER
            </span>
          </div>

          <div className="why-text">
            <strong>{activeNode.node}</strong> is classified as <strong>DANGER</strong> because{' '}
            <strong>5 monitored indicators are simultaneously at warning level</strong>.
            Notice the crucial distinction: it is <em>not</em> 5 critical sensors (
            <code>critical_sensors = 0</code>, <code>warning_sensors = 5</code>).
            The firmware risk engine elevates co-occurring warnings to DANGER status and accelerates telemetry
            to the 3-second emergency interval.
          </div>

          {/* 5 Warning Indicators Row */}
          <div className="why-indicators-row">
            <div className="indicator-chip warn">
              <span className="ind-name">Temperature</span>
              <span className="ind-val">{activeNode.temperature.toFixed(1)} °C</span>
              <span className="ind-badge">WARNING ⚠️</span>
            </div>

            <div className="indicator-chip warn">
              <span className="ind-name">Barometric Pressure</span>
              <span className="ind-val">{activeNode.pressure.toFixed(0)} Pa</span>
              <span className="ind-badge">WARNING ⚠️</span>
            </div>

            <div className="indicator-chip warn">
              <span className="ind-name">Gas Concentration</span>
              <span className="ind-val">{activeNode.gas_ppm_equiv.toFixed(0)} ppm-eq</span>
              <span className="ind-badge">WARNING ⚠️</span>
            </div>

            <div className="indicator-chip warn">
              <span className="ind-name">Inclinometer Tilt</span>
              <span className="ind-val">{activeNode.tilt_deg.toFixed(2)}°</span>
              <span className="ind-badge">WARNING ⚠️</span>
            </div>

            <div className="indicator-chip warn">
              <span className="ind-name">Roof Strata Load</span>
              <span className="ind-val">{activeNode.load_kg.toFixed(2)} kg</span>
              <span className="ind-badge">WARNING ⚠️</span>
            </div>
          </div>
        </div>

        {/* Action Button Strip */}
        <div className="alert-footer-actions">
          <div className="alert-beacon-note">
            <ShieldAlert size={16} color="#ef4444" />
            <span>
              <strong>Physical Verification:</strong> The simulated buzzer on ESP32 GPIO 10 and this GIS Map both pinpoint {activeNode.node}.
            </span>
          </div>

          <button
            className="btn-locate-master"
            onClick={() => onFocusMap(activeNode.latitude, activeNode.longitude, activeNode.node)}
          >
            <MapPin size={16} />
            Locate {activeNode.node} on GIS Map ({activeNode.latitude.toFixed(6)}, {activeNode.longitude.toFixed(6)})
          </button>
        </div>
      </div>
    </section>
  );
};
