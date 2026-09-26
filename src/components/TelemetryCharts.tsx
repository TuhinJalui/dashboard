import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { TrendingUp, Flame } from 'lucide-react';
import { NodeData } from '../types';

Chart.register(...registerables);

interface TelemetryChartsProps {
  nodes: NodeData[];
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ nodes }) => {
  const tiltCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gasTempCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const tiltChartRef = useRef<Chart | null>(null);
  const gasTempChartRef = useRef<Chart | null>(null);

  const historyRef = useRef<{
    labels: string[];
    tilts: { [key: string]: number[] };
    maxGas: number[];
    maxTemp: number[];
  }>({
    labels: [],
    tilts: { 'NODE-1': [], 'NODE-2': [], 'NODE-3': [], 'NODE-4': [], 'NODE-5': [] },
    maxGas: [],
    maxTemp: [],
  });

  useEffect(() => {
    if (!tiltCanvasRef.current || !gasTempCanvasRef.current) return;

    const commonScales = {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 9 } },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } },
      },
    };

    // 1. Tilt Chart
    tiltChartRef.current = new Chart(tiltCanvasRef.current, {
      type: 'line',
      data: {
        labels: historyRef.current.labels,
        datasets: [
          {
            label: 'NODE-1 Tilt (°)',
            data: historyRef.current.tilts['NODE-1'],
            borderColor: '#10b981',
            tension: 0.3,
            borderWidth: 1.5,
            pointRadius: 1,
          },
          {
            label: 'NODE-2 Tilt (°)',
            data: historyRef.current.tilts['NODE-2'],
            borderColor: '#38bdf8',
            tension: 0.3,
            borderWidth: 1.5,
            pointRadius: 1,
          },
          {
            label: 'NODE-3 Tilt (° - CRITICAL ZONE)',
            data: historyRef.current.tilts['NODE-3'],
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            tension: 0.3,
            borderWidth: 2.5,
            pointRadius: 3,
          },
          {
            label: 'NODE-4 Tilt (°)',
            data: historyRef.current.tilts['NODE-4'],
            borderColor: '#8b5cf6',
            tension: 0.3,
            borderWidth: 1.5,
            pointRadius: 1,
          },
          {
            label: 'NODE-5 Tilt (°)',
            data: historyRef.current.tilts['NODE-5'],
            borderColor: '#06b6d4',
            tension: 0.3,
            borderWidth: 1.5,
            pointRadius: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } },
          },
        },
        scales: {
          ...commonScales,
          y: {
            ...commonScales.y,
            title: { display: true, text: 'Tilt (Degrees)', color: '#94a3b8' },
            suggestedMin: 0,
            suggestedMax: 6,
          },
        },
      },
    });

    // 2. Gas & Temp Chart
    gasTempChartRef.current = new Chart(gasTempCanvasRef.current, {
      type: 'line',
      data: {
        labels: historyRef.current.labels,
        datasets: [
          {
            label: 'Peak Gas Indicator (ppm-equiv)',
            data: historyRef.current.maxGas,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            yAxisID: 'yGas',
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 2,
          },
          {
            label: 'Peak Temperature (°C)',
            data: historyRef.current.maxTemp,
            borderColor: '#ec4899',
            yAxisID: 'yTemp',
            tension: 0.3,
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } },
          },
        },
        scales: {
          x: commonScales.x,
          yGas: {
            type: 'linear',
            position: 'left',
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#f59e0b' },
            title: { display: true, text: 'Gas (ppm-equiv)', color: '#f59e0b' },
            suggestedMin: 0,
            suggestedMax: 15000,
          },
          yTemp: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#ec4899' },
            title: { display: true, text: 'Temp (°C)', color: '#ec4899' },
            suggestedMin: 20,
            suggestedMax: 50,
          },
        },
      },
    });

    return () => {
      tiltChartRef.current?.destroy();
      gasTempChartRef.current?.destroy();
    };
  }, []);

  // Ingest incoming node telemetry
  useEffect(() => {
    if (!nodes.length) return;
    const timeLabel = new Date().toLocaleTimeString().split(' ')[0];

    const hist = historyRef.current;
    if (hist.labels.length >= 20) {
      hist.labels.shift();
      Object.keys(hist.tilts).forEach((k) => hist.tilts[k].shift());
      hist.maxGas.shift();
      hist.maxTemp.shift();
    }

    hist.labels.push(timeLabel);

    let peakGas = 0;
    let peakTemp = 0;

    nodes.forEach((n) => {
      if (hist.tilts[n.node]) {
        hist.tilts[n.node].push(n.tilt_deg);
      }
      if (n.gas_ppm_equiv > peakGas) peakGas = n.gas_ppm_equiv;
      if (n.temperature > peakTemp) peakTemp = n.temperature;
    });

    hist.maxGas.push(peakGas);
    hist.maxTemp.push(peakTemp);

    tiltChartRef.current?.update('none');
    gasTempChartRef.current?.update('none');
  }, [nodes]);

  return (
    <section className="charts-grid">
      {/* Subsidence Tilt Chart */}
      <div className="panel-card">
        <div className="panel-header">
          <div className="panel-title-group">
            <TrendingUp size={18} color="#ef4444" />
            <h2 className="panel-title">Multi-Node Subsidence Tilt Displacement Trend</h2>
          </div>
          <span className="panel-badge">MPU-6050 INCLINOMETERS</span>
        </div>
        <div className="chart-wrapper">
          <canvas ref={tiltCanvasRef} />
        </div>
      </div>

      {/* Gas & Temperature Chart */}
      <div className="panel-card">
        <div className="panel-header">
          <div className="panel-title-group">
            <Flame size={18} color="#f59e0b" />
            <h2 className="panel-title">Gas Level Indicator (MQ-2) vs Ambient Temperature</h2>
          </div>
          <span className="panel-badge">ENVIRONMENTAL CORRELATION</span>
        </div>
        <div className="chart-wrapper">
          <canvas ref={gasTempCanvasRef} />
        </div>
      </div>
    </section>
  );
};
