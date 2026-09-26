/**
 * VANGUARD Mine Subsidence - Data Management & Telemetry Processing Service
 * 
 * Strictly follows the evaluation and calculation rules documented in Technical Handoff:
 * - Sensor Thresholds (Section 9)
 * - Status Logic (Section 11)
 * - Risk Score (Section 12)
 * - Adaptive Communication (Section 13)
 * - Multiple Critical Alarm Selection (Section 24)
 * - Battery Model (Section 25)
 */

import { NodeData, SensorState, EvaluatedSensorStates, OverallRisk, AlarmState, LoRaPacketLog, DemoScenario } from '../types';
import { SENSOR_THRESHOLDS, TRANSMISSION_INTERVALS, INITIAL_DEMO_NODES, LORA_ROUTES } from '../constants';
import { audioAlarmService } from './audioAlarm';

export class DataService {
  private mode: 'SIMULATION' | 'LIVE_GATEWAY' = 'SIMULATION';
  private gatewayUrl: string = 'http://localhost:8180';
  private nodes: NodeData[] = JSON.parse(JSON.stringify(INITIAL_DEMO_NODES));
  private virtualClock: number = 0;
  private pollIntervalId: number | null = null;
  private listeners: ((nodes: NodeData[], alarm: AlarmState) => void)[] = [];
  private packetListeners: ((packet: LoRaPacketLog) => void)[] = [];

  constructor() {
    this.recomputeAll();
  }

  // Evaluate sensor state based on firmware thresholds
  public evaluateGas(gasPpm: number): SensorState {
    if (gasPpm >= SENSOR_THRESHOLDS.GAS_CRITICAL_PPM) return 'CRITICAL_SENSOR';
    if (gasPpm >= SENSOR_THRESHOLDS.GAS_WARNING_PPM) return 'WARNING_SENSOR';
    return 'NORMAL';
  }

  public evaluateTemperature(tempC: number): SensorState {
    if (tempC >= SENSOR_THRESHOLDS.TEMP_CRITICAL_C) return 'CRITICAL_SENSOR';
    if (tempC >= SENSOR_THRESHOLDS.TEMP_WARNING_C) return 'WARNING_SENSOR';
    return 'NORMAL';
  }

  public evaluatePressure(pressurePa: number, baselinePa: number = 101325): SensorState {
    const drop = (baselinePa - pressurePa) / baselinePa;
    if (drop >= SENSOR_THRESHOLDS.PRESSURE_CRITICAL_DROP) return 'CRITICAL_SENSOR';
    if (drop >= SENSOR_THRESHOLDS.PRESSURE_WARNING_DROP) return 'WARNING_SENSOR';
    return 'NORMAL';
  }

  public evaluateTilt(tiltDeg: number): SensorState {
    if (tiltDeg >= SENSOR_THRESHOLDS.TILT_CRITICAL_DEG) return 'CRITICAL_SENSOR';
    if (tiltDeg >= SENSOR_THRESHOLDS.TILT_WARNING_DEG) return 'WARNING_SENSOR';
    return 'NORMAL';
  }

  public evaluateLoad(loadKg: number): SensorState {
    if (loadKg >= SENSOR_THRESHOLDS.LOAD_CRITICAL_KG) return 'CRITICAL_SENSOR';
    if (loadKg >= SENSOR_THRESHOLDS.LOAD_WARNING_KG) return 'WARNING_SENSOR';
    return 'NORMAL';
  }

  // Recompute single node according to exact firmware logic
  public evaluateNode(node: NodeData): void {
    const baseline = node.pressureBaseline || 101325;
    const states: EvaluatedSensorStates = {
      gas: this.evaluateGas(node.gas_ppm_equiv),
      temperature: this.evaluateTemperature(node.temperature),
      pressure: this.evaluatePressure(node.pressure, baseline),
      tilt: this.evaluateTilt(node.tilt_deg),
      load: this.evaluateLoad(node.load_kg),
    };

    node.sensorStates = states;

    let warningCount = 0;
    let criticalCount = 0;

    Object.values(states).forEach((st) => {
      if (st === 'WARNING_SENSOR') warningCount++;
      if (st === 'CRITICAL_SENSOR') criticalCount++;
    });

    node.warning_sensors = warningCount;
    node.critical_sensors = criticalCount;

    // Technical Handoff Section 11:
    // IF criticalCount > 0 → DANGER
    // ELSE IF warningCount >= 3 → DANGER
    // ELSE IF warningCount > 0 → WARNING
    // ELSE → SAFE
    if (criticalCount > 0) {
      node.status = 'DANGER';
    } else if (warningCount >= 3) {
      node.status = 'DANGER'; // e.g. Node 3 with 5 warnings triggers DANGER
    } else if (warningCount > 0) {
      node.status = 'WARNING';
    } else {
      node.status = 'SAFE';
    }

    // Technical Handoff Section 12:
    // Risk Score = (warning sensors × 12) + (critical sensors × 30) [capped at 100]
    node.risk_score = Math.min(100, warningCount * 12 + criticalCount * 30);

    // Technical Handoff Section 13:
    // Adaptive Communication Frequency
    if (node.status === 'SAFE') {
      node.sample_interval_seconds = TRANSMISSION_INTERVALS.SAFE_SECONDS;
    } else if (node.status === 'WARNING') {
      node.sample_interval_seconds = TRANSMISSION_INTERVALS.WARNING_SECONDS;
    } else {
      node.sample_interval_seconds = TRANSMISSION_INTERVALS.DANGER_SECONDS;
    }
  }

  // Recompute all nodes and resolve tie-breaker for active audible buzzer
  public recomputeAll(): AlarmState {
    this.nodes.forEach((n) => this.evaluateNode(n));

    // Technical Handoff Section 24:
    // If multiple nodes become critical, the one with highest risk score is the active audible locator.
    let maxCritScore = -1;
    let criticalNode: NodeData | null = null;
    let maxWarnScore = -1;
    let warningNode: NodeData | null = null;

    this.nodes.forEach((n) => {
      n.buzzerActive = false;
      if (n.status === 'DANGER') {
        if (n.risk_score > maxCritScore) {
          maxCritScore = n.risk_score;
          criticalNode = n;
        }
      } else if (n.status === 'WARNING') {
        if (n.risk_score > maxWarnScore) {
          maxWarnScore = n.risk_score;
          warningNode = n;
        }
      }
    });

    let alarm: AlarmState;

    if (criticalNode) {
      (criticalNode as NodeData).buzzerActive = true;
      alarm = {
        mode: 'DANGER',
        activeNode: criticalNode,
        activeBuzzerNodeId: (criticalNode as NodeData).node,
        sirenFrequencyHz: 3000,
      };
    } else if (warningNode) {
      // Siren is activated ONLY in critical/danger
      (warningNode as NodeData).buzzerActive = false;
      alarm = {
        mode: 'WARNING',
        activeNode: warningNode,
        activeBuzzerNodeId: null,
        sirenFrequencyHz: 0,
      };
    } else {
      alarm = {
        mode: 'SAFE',
        activeNode: null,
        activeBuzzerNodeId: null,
        sirenFrequencyHz: 0,
      };
    }

    // Update hardware sound synthesizer
    audioAlarmService.updateAlarm(alarm.mode, alarm.activeBuzzerNodeId);

    return alarm;
  }

  // Advance simulation clock and fire individual independent packet transmissions
  public tickSimulation(): void {
    this.virtualClock += 1;

    this.nodes.forEach((node, idx) => {
      // Simulate slight realistic physical sensor fluctuation
      if (idx !== 2) {
        // Node 3 is held steady for demonstration unless manipulated via sliders
        const jitter = (Math.random() - 0.5) * 0.04;
        node.tilt_deg = Math.max(0, parseFloat((node.tilt_deg + jitter).toFixed(2)));
      }

      // Battery model: Section 25
      const drain = node.status === 'DANGER' ? 0.04 : node.status === 'WARNING' ? 0.02 : 0.01;
      node.battery_percent = Math.max(5.0, parseFloat((node.battery_percent - drain * 0.1).toFixed(2)));

      // Section 15: "Each node has its own timer ... If only Node 3's timer expires, only Node 3 sends a new packet"
      if (this.virtualClock % node.sample_interval_seconds === 0) {
        node.packets_sent += 1;
        this.emitPacketLog(node, idx);
      }
    });

    const alarm = this.recomputeAll();
    this.notifyListeners(alarm);
  }

  private emitPacketLog(node: NodeData, index: number): void {
    const route = LORA_ROUTES[index] || 'NODE -> GATEWAY';
    const packet: LoRaPacketLog = {
      id: `${Date.now()}-${node.node}`,
      source: node.node,
      route,
      status: node.status,
      gps: `${node.latitude.toFixed(6)}, ${node.longitude.toFixed(6)}`,
      payload: {
        temp: node.temperature,
        gas: node.gas_ppm_equiv,
        tilt: node.tilt_deg,
        load: node.load_kg,
        risk: node.risk_score,
      },
      timestamp: new Date().toLocaleTimeString(),
    };

    this.packetListeners.forEach((cb) => cb(packet));
  }

  // Poll live gateway from ESP32 / Wokwi
  public async pollLiveGateway(): Promise<void> {
    try {
      const response = await fetch(`${this.gatewayUrl}/api/nodes`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data && Array.isArray(data.nodes)) {
        this.nodes = data.nodes;
        const alarm = this.recomputeAll();
        this.notifyListeners(alarm);
      }
    } catch (err) {
      console.warn('Live gateway polling failed, maintaining local state:', err);
    }
  }

  public loadScenario(scenario: DemoScenario): void {
    if (scenario === 'DEFAULT_DEMO') {
      // Technical Handoff Section 4 & 5: Node-2 Warning Gas, Node-3 DANGER (5 warnings)
      this.nodes[1].gas_ppm_equiv = 8500;
      this.nodes[1].temperature = 30.0;
      this.nodes[1].pressure = 100900;
      this.nodes[1].tilt_deg = 1.2;
      this.nodes[1].load_kg = 1.5;

      this.nodes[2].temperature = 37.0;
      this.nodes[2].pressure = 98000;
      this.nodes[2].gas_ppm_equiv = 9000;
      this.nodes[2].tilt_deg = 3.5;
      this.nodes[2].load_kg = 6.0;

      // Nodes 1, 4, 5 Safe
      this.nodes[0].tilt_deg = 0.5;
      this.nodes[0].load_kg = 1.0;
      this.nodes[3].tilt_deg = 0.7;
      this.nodes[4].tilt_deg = 0.8;
    } else if (scenario === 'ROCKBURST_SUBSIDENCE') {
      // Sudden major tilt and structural roof overload on Node 1
      this.nodes[0].tilt_deg = 6.8; // Critical (>5°)
      this.nodes[0].load_kg = 14.5; // Critical (>10kg)
      this.nodes[0].pressure = 96000;
    } else if (scenario === 'METHANE_OUTBURST') {
      // Severe toxic gas spike on Node 2
      this.nodes[1].gas_ppm_equiv = 14200; // Critical (>12500 ppm-equiv)
      this.nodes[1].temperature = 38.0;
    } else if (scenario === 'ALL_CLEAR_SAFE') {
      // Reset all nodes to safe baseline
      this.nodes.forEach((n) => {
        n.temperature = 28.0;
        n.humidity = 60.0;
        n.pressure = 101325.0;
        n.gas_ppm_equiv = 1200.0;
        n.tilt_deg = 0.5;
        n.load_kg = 1.0;
      });
    }

    const alarm = this.recomputeAll();
    this.notifyListeners(alarm);
  }

  public updateNodeParameter(nodeIndex: number, field: keyof NodeData, value: number): void {
    if (this.nodes[nodeIndex]) {
      (this.nodes[nodeIndex] as unknown as Record<string, unknown>)[field] = value;
      const alarm = this.recomputeAll();
      this.notifyListeners(alarm);
    }
  }

  public start(intervalMs: number = 1500): void {
    if (this.pollIntervalId !== null) {
      clearInterval(this.pollIntervalId);
    }

    this.pollIntervalId = window.setInterval(() => {
      if (this.mode === 'LIVE_GATEWAY') {
        this.pollLiveGateway();
      } else {
        this.tickSimulation();
      }
    }, intervalMs);

    const alarm = this.recomputeAll();
    this.notifyListeners(alarm);
  }

  public stop(): void {
    if (this.pollIntervalId !== null) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  public setMode(mode: 'SIMULATION' | 'LIVE_GATEWAY'): void {
    this.mode = mode;
  }

  public getMode(): 'SIMULATION' | 'LIVE_GATEWAY' {
    return this.mode;
  }

  public setGatewayUrl(url: string): void {
    this.gatewayUrl = url;
  }

  public getGatewayUrl(): string {
    return this.gatewayUrl;
  }

  public getNodes(): NodeData[] {
    return JSON.parse(JSON.stringify(this.nodes));
  }

  public subscribe(cb: (nodes: NodeData[], alarm: AlarmState) => void): () => void {
    this.listeners.push(cb);
    cb(this.getNodes(), this.recomputeAll());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  public subscribePackets(cb: (packet: LoRaPacketLog) => void): () => void {
    this.packetListeners.push(cb);
    return () => {
      this.packetListeners = this.packetListeners.filter((l) => l !== cb);
    };
  }

  private notifyListeners(alarm: AlarmState): void {
    const nodesCopy = this.getNodes();
    this.listeners.forEach((l) => l(nodesCopy, alarm));
  }
}

export const dataService = new DataService();
