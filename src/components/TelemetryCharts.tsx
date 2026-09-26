import React, { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { TrendingUp, Activity, Compass, Wind, Gauge, Weight, Thermometer } from 'lucide-react';
import { NodeData } from '../types';

Chart.register(...registerables);

interface TelemetryChartsProps {
  nodes: NodeData[];
}

type MetricType = 'TILT' | 'GAS' | 'PRESSURE' | 'LOAD' | 'RISK' | 'TEMPERATURE';

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ nodes }) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('TILT');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const historyRef = useRef<{
    labels: string[];
    data: { [nodeId: string]: { [metric: string]: number[] } };
  }>({
    labels: [],
    data: {
      'NODE-1': { TILT: [], GAS: [], PRESSURE: [], LOAD: [], RISK: [], TEMPERATURE: [] },
      'NODE-2': { TILT: [], GAS: [], PRESSURE: [], LOAD: [], RISK: [], TEMPERATURE: [] },
      'NODE-3': { TILT: [], GAS: [], PRESSURE: [], LOAD: [], RISK: [], TEMPERATURE: [] },
      'NODE-4': { TILT: [], GAS: [], PRESSURE: [], LOAD: [], RISK: [], TEMPERATURE: [] },
      'NODE-5': { TILT: [], GAS: [], PRESSURE: [], LOAD: [], RISK: [], TEMPERATURE: [] },
    },
  });

  // Record incoming telemetry sample
  useEffect(() => {
    const timeLabel = new Date().toLocaleTimeString().split(' ')[0];
    const h = historyRef.current;

    h.labels.push(timeLabel);
    if (h.labels.length > 25) h.labels.shift();

    nodes.forEach((n) => {
      const rec = h.data[n.node];
      if (!rec) return;

      rec.TILT.push(n.tilt_deg);
      rec.GAS.push(n.gas_ppm_equiv);
      rec.PRESSURE.push(n.pressure);
      rec.LOAD.push(n.load_kg);
      rec.RISK.push(n.risk_score);
      rec.TEMPERATURE.push(n.temperature);

      if (rec.TILT.length > 25) rec.TILT.shift();
      if (rec.GAS.length > 25) rec.GAS.shift();
      if (rec.PRESSURE.length > 25) rec.PRESSURE.shift();
      if (rec.LOAD.length > 25) rec.LOAD.shift();
      if (rec.RISK.length > 25) rec.RISK.shift();
      if (rec.TEMPERATURE.length > 25) rec.TEMPERATURE.shift();
    });

    if (chartInstanceRef.current) {
      chartInstanceRef.current.update('none');
    }
  }, [nodes]);

  // Rebuild chart when metric changes or on initial mount
  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const nodeColors: { [key: string]: { border: string; bg: string } } = {
      'NODE-1': { border: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
      'NODE-2': { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
      'NODE-3': { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)' },
      'NODE-4': { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
      'NODE-5': { border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)' },
    };

    const metricLabels: { [key in MetricType]: { title: string; unit: string } } = {
      TILT: { title: 'Inclinometer Angular Tilt', unit: '°' },
      GAS: { title: 'Gas Concentration Equivalent', unit: 'ppm-eq' },
      PRESSURE: { title: 'Barometric Pressure', unit: 'Pa' },
      LOAD: { title: 'Roof Strata Load Cell', unit: 'kg' },
      RISK: { title: 'Composite Risk Score', unit: '/100' },
      TEMPERATURE: { title: 'Ambient Temperature', unit: '°C' },
    };

    const datasets = ['NODE-1', 'NODE-2', 'NODE-3', 'NODE-4', 'NODE-5'].map((nodeId) => {
      const isCrit = nodeId === 'NODE-3';
      return {
        label: `${nodeId} (${metricLabels[selectedMetric].unit})`,
        data: historyRef.current.data[nodeId]?.[selectedMetric] || [],
        borderColor: nodeColors[nodeId].border,
        backgroundColor: isCrit ? nodeColors[nodeId].bg : 'transparent',
        borderWidth: isCrit ? 2.5 : 1.5,
        pointRadius: isCrit ? 3 : 1.5,
        tension: 0.3,
        fill: isCrit,
      };
    });

    chartInstanceRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: historyRef.current.labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 9 } },
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 },
            },
          },
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: { family: 'JetBrains Mono', size: 11 },
              boxWidth: 12,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleFont: { family: 'Chakra Petch', size: 12 },
            bodyFont: { family: 'JetBrains Mono', size: 11 },
            borderColor: 'rgba(56, 189, 248, 0.3)',
            borderWidth: 1,
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [selectedMetric]);

  return (
    <div className="panel-card telemetry-trends-card">
      <div className="panel-header">
        <div className="panel-title-group">
          <TrendingUp size={18} color="#38bdf8" />
          <h2 className="panel-title">Mine Strata & Environmental Telemetry Trends</h2>
        </div>
        <span className="panel-badge">LIVE 25-SAMPLE WINDOW</span>
      </div>

      {/* 6 Metric Selectors Strip (Point 9) */}
      <div className="metric-toggle-strip">
        <button
          className={`metric-btn ${selectedMetric === 'TILT' ? 'active' : ''}`}
          onClick={() => setSelectedMetric('TILT')}
        >
          <Compass size={13} />
          Tilt Trend (°)
        </button>

        <button
          className={`metric-btn ${selectedMetric === 'GAS' ? 'active' : ''}`}
          onClick={() => setSelectedMetric('GAS')}
        >
          <Wind size={13} />
          Gas Trend (ppm)
        </button>

        <button
          className={`metric-btn ${selectedMetric === 'PRESSURE' ? 'active' : ''}`}
          onClick={() => setSelectedMetric('PRESSURE')}
        >
          <Gauge size={13} />
          Pressure Trend (Pa)
        </button>

        <button
          className={`metric-btn ${selectedMetric === 'LOAD' ? 'active' : ''}`}
          onClick={() => setSelectedMetric('LOAD')}
        >
          <Weight size={13} />
          Roof Load Trend (kg)
        </button>

        <button
          className={`metric-btn ${selectedMetric === 'RISK' ? 'active' : ''}`}
          onClick={() => setSelectedMetric('RISK')}
        >
          <Activity size={13} />
          Risk Score (/100)
        </button>

        <button
          className={`metric-btn ${selectedMetric === 'TEMPERATURE' ? 'active' : ''}`}
          onClick={() => setSelectedMetric('TEMPERATURE')}
        >
          <Thermometer size={13} />
          Temperature Trend (°C)
        </button>
      </div>

      <div style={{ position: 'relative', height: '320px', width: '100%', marginTop: '0.85rem' }}>
        <canvas ref={canvasRef} />
      </div>

      <div className="chart-notes-footer">
        <span>● <strong>NODE-3 (Fault Shear Zone)</strong> is emphasized with red emergency envelope</span>
        <span>● Multi-Hop Cadence: DANGER (3s), WARNING (15s), SAFE (40s)</span>
      </div>
    </div>
  );
};
