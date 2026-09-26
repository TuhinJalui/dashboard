import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, BellRing, Monitor, Radio, ShieldAlert } from 'lucide-react';
import { audioAlarmService } from '../services/audioAlarm';

interface HeaderProps {
  mode: 'SIMULATION' | 'LIVE_GATEWAY';
  gatewayUrl: string;
  onSelectMode: (mode: 'SIMULATION' | 'LIVE_GATEWAY') => void;
  onOpenGatewayModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  gatewayUrl,
  onSelectMode,
  onOpenGatewayModal,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [clock, setClock] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(now.toTimeString().split(' ')[0]);
      setDateStr(now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleMute = () => {
    const nextMuted = audioAlarmService.toggleMute();
    setIsMuted(nextMuted);
  };

  const handleTestSiren = () => {
    audioAlarmService.triggerTestSiren();
    setIsMuted(false);
  };

  return (
    <header className="top-header">
      <div className="brand-section">
        <div className="brand-icon-box">
          <ShieldAlert size={28} />
        </div>
        <div>
          <h1 className="brand-title">
            VANGUARD <span>MINE GEOTECH</span>
          </h1>
          <div className="brand-subtitle">
            5-NODE LoRa MULTI-HOP SUBSIDENCE & ENVIRONMENTAL MONITORING
          </div>
        </div>
      </div>

      <div className="header-controls">
        {/* Gateway connection pill */}
        <div className="connection-pill">
          <div className="status-dot active-pulse" />
          <span>
            {mode === 'SIMULATION'
              ? 'SIMULATION ENGINE (WOKWI SYNC)'
              : `GATEWAY: ${gatewayUrl}`}
          </span>
        </div>

        {/* Mode Switcher */}
        <div className="button-group">
          <button
            className={`mode-btn ${mode === 'SIMULATION' ? 'active' : ''}`}
            onClick={() => onSelectMode('SIMULATION')}
          >
            <Monitor size={14} />
            Sim Mode
          </button>
          <button
            className={`mode-btn ${mode === 'LIVE_GATEWAY' ? 'active' : ''}`}
            onClick={onOpenGatewayModal}
          >
            <Radio size={14} />
            Live Gateway
          </button>
        </div>

        {/* Siren Acoustics Toggle */}
        <button
          className={`btn-action btn-alarm-mute ${isMuted ? 'muted' : ''}`}
          onClick={handleToggleMute}
          title="Toggle Hardware Siren Acoustics (3000 Hz / 1800 Hz)"
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          {isMuted ? 'Siren Muted' : 'Siren Armed'}
        </button>

        {/* Test Siren */}
        <button className="btn-action" onClick={handleTestSiren} title="Test 3000 Hz piezo acoustic siren">
          <BellRing size={15} />
          Test Siren
        </button>

        {/* Clock */}
        <div className="clock-display">
          <span>{clock}</span>
          <span className="sub">{dateStr}</span>
        </div>
      </div>
    </header>
  );
};
