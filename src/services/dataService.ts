/**
 * VANGUARD Mine Subsidence - Data Management & Telemetry Processing Service
 * 
 * Directly connected to live Wokwi ESP32-S3 simulation (via RFC2217 / SSE bridge)
 * and providing high-fidelity fallback dynamic simulation engine.
 * 
 * Implements Technical Handoff:
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

export interface WokwiBridgeStatus {
  connected: boolean;
  totalPackets: number;
  lastPacketTime: number | null;
}

export class DataService {
  private mode: 'SIMULATION' | 'LIVE_GATEWAY' = 'LIVE_GATEWAY';
  private gatewayUrl: string = 'http://localhost:8180';
  private nodes: NodeData[] = JSON.parse(JSON.stringify(INITIAL_DEMO_NODES));
  private virtualClock: number = 0;
  private pollIntervalId: number | null = null;
  private sseEventSource: EventSource | null = null;
  private isWokwiLive: boolean = false;
  private totalPacketsReceived: number = 0;
  private lastPacketTimestamp: number | null = null;

  private listeners: ((nodes: NodeData[], alarm: AlarmState) => void)[] = [];
  private packetListeners: ((packet: LoRaPacketLog) => void)[] = [];
  private connectionListeners: ((status: WokwiBridgeStatus) => void)[] = [];

  constructor() {
    this.recomputeAll();
    this.initNodeCountdowns();
    this.connectLiveStream();
  }

  private initNodeCountdowns(): void {
    this.nodes.forEach((n) => {
      n.sample_interval_seconds = n.status === 'DANGER' ? 3 : n.status === 'WARNING' ? 15 : 40;
    });
  }

  // Connect to SSE stream from Wokwi Bridge
  public connectLiveStream(): void {
    if (this.sseEventSource) {
      try {
        this.sseEventSource.close();
      } catch (_) { }
      this.sseEventSource = null;
    }

    try {
      const sseUrl = `${this.gatewayUrl}/api/stream`;
      console.log(`[DataService] Connecting to live Wokwi stream: ${sseUrl}`);
      const es = new EventSource(sseUrl);

      es.addEventListener('connection', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.isWokwiLive = Boolean(data.connected);
          this.notifyConnectionListeners();
          console.log(`[DataService] Wokwi hardware bridge status:`, data);
        } catch (e) {
          console.error(e);
        }
      });

      es.addEventListener('packet', (event: MessageEvent) => {
        try {
          const packet: LoRaPacketLog = JSON.parse(event.data);
          this.totalPacketsReceived++;
          this.lastPacketTimestamp = Date.now();
          this.packetListeners.forEach((cb) => cb(packet));
          this.notifyConnectionListeners();
        } catch (e) {
          console.error('[DataService] Packet parse error:', e);
        }
      });

      es.addEventListener('nodes', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data && Array.isArray(data.nodes) && data.nodes.length > 0) {
            this.isWokwiLive = true;
            // Merge with local nodes preserving roles
            this.nodes = data.nodes.map((liveNode: Partial<NodeData>, idx: number) => {
              const prev = this.nodes[idx] || INITIAL_DEMO_NODES[idx];
              return {
                ...prev,
                ...liveNode,
                role: prev.role,
                pressureBaseline: prev.pressureBaseline || 101325,
              };
            });

            const alarm = this.recomputeAll();
            this.notifyListeners(alarm);
            this.notifyConnectionListeners();
          }
        } catch (e) {
          console.error('[DataService] Nodes parse error:', e);
        }
      });

      es.onerror = () => {
        if (this.isWokwiLive) {
          this.isWokwiLive = false;
          this.notifyConnectionListeners();
        }
      };

      this.sseEventSource = es;
    } catch (err) {
      console.warn('[DataService] Failed to establish SSE, will poll HTTP endpoint:', err);
    }
  }

  // Sensor threshold evaluators (Section 9)
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

    // Risk Score: Section 12
    node.risk_score = Math.min(100, warningCount * 12 + criticalCount * 30);

    // Adaptive Transmission: Section 13
    if (node.status === 'SAFE') {
      node.sample_interval_seconds = TRANSMISSION_INTERVALS.SAFE_SECONDS;
    } else if (node.status === 'WARNING') {
      node.sample_interval_seconds = TRANSMISSION_INTERVALS.WARNING_SECONDS;
    } else {
      node.sample_interval_seconds = TRANSMISSION_INTERVALS.DANGER_SECONDS;
    }
  }

  // Recompute all nodes and resolve tie-breaker for active audible buzzer (Section 24)
  public recomputeAll(): AlarmState {
    this.nodes.forEach((n) => this.evaluateNode(n));

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
      // Siren is restricted exclusively to critical/danger
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

    // Update sound synthesizer (strict critical siren)
    audioAlarmService.updateAlarm(alarm.mode, alarm.activeBuzzerNodeId);

    return alarm;
  }

  // Dynamic simulation tick with lively physics fluctuations
  public tickSimulation(): void {
    this.virtualClock += 1;

    this.nodes.forEach((node, idx) => {
      // Realistic micro-vibrations and ambient drift
      const tiltJitter = (Math.random() - 0.49) * 0.06;
      const loadJitter = (Math.random() - 0.49) * 0.08;
      const tempJitter = (Math.random() - 0.48) * 0.05;
      const gasJitter = (Math.random() - 0.49) * 25.0;

      // Keep Node 3 in DANGER envelope but dynamically alive
      if (idx === 2) {
        node.tilt_deg = parseFloat(Math.min(4.9, Math.max(3.2, node.tilt_deg + tiltJitter)).toFixed(2));
        node.load_kg = parseFloat(Math.min(9.5, Math.max(5.5, node.load_kg + loadJitter)).toFixed(2));
        node.temperature = parseFloat(Math.min(39.5, Math.max(36.0, node.temperature + tempJitter)).toFixed(1));
        node.gas_ppm_equiv = Math.min(11500, Math.max(8200, Math.round(node.gas_ppm_equiv + gasJitter)));
      } else if (idx === 1) {
        // Node 2 WARNING envelope
        node.gas_ppm_equiv = Math.min(11500, Math.max(7600, Math.round(node.gas_ppm_equiv + gasJitter)));
        node.tilt_deg = parseFloat(Math.max(0.1, node.tilt_deg + tiltJitter * 0.5).toFixed(2));
        node.temperature = parseFloat(Math.max(25.0, node.temperature + tempJitter * 0.5).toFixed(1));
      } else {
        // Safe nodes
        node.tilt_deg = parseFloat(Math.max(0.05, Math.min(2.5, node.tilt_deg + tiltJitter * 0.3)).toFixed(2));
        node.temperature = parseFloat(Math.max(24.0, Math.min(33.0, node.temperature + tempJitter * 0.3)).toFixed(1));
        node.gas_ppm_equiv = Math.max(200, Math.min(3500, Math.round(node.gas_ppm_equiv + gasJitter * 0.5)));
      }

      // Battery model (Section 25)
      const drain = node.status === 'DANGER' ? 0.04 : node.status === 'WARNING' ? 0.02 : 0.01;
      node.battery_percent = Math.max(5.0, parseFloat((node.battery_percent - drain * 0.05).toFixed(2)));

      // Individual transmit timer (Technical Handoff Section 15)
      const interval = node.sample_interval_seconds || 40;
      if (this.virtualClock % interval === 0) {
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
      id: `${Date.now()}-${node.node}-${Math.random().toString(36).substring(2, 6)}`,
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

    this.totalPacketsReceived++;
    this.lastPacketTimestamp = Date.now();
    this.packetListeners.forEach((cb) => cb(packet));
    this.notifyConnectionListeners();
  }

  // Poll live gateway directly via HTTP
  public async pollLiveGateway(): Promise<void> {
    try {
      const response = await fetch(`${this.gatewayUrl}/api/nodes`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data && Array.isArray(data.nodes) && data.nodes.length > 0) {
        if (data.connectedToWokwi !== undefined) {
          this.isWokwiLive = Boolean(data.connectedToWokwi);
        } else {
          this.isWokwiLive = true;
        }

        if (typeof data.totalPacketsBridged === 'number') {
          this.totalPacketsReceived = Math.max(this.totalPacketsReceived, data.totalPacketsBridged);
        }

        this.nodes = data.nodes.map((liveNode: Partial<NodeData>, idx: number) => {
          const prev = this.nodes[idx] || INITIAL_DEMO_NODES[idx];
          return {
            ...prev,
            ...liveNode,
            role: prev.role,
            pressureBaseline: prev.pressureBaseline || 101325,
          };
        });

        const alarm = this.recomputeAll();
        this.notifyListeners(alarm);
        this.notifyConnectionListeners();
      }
    } catch (err) {
      if (this.isWokwiLive) {
        this.isWokwiLive = false;
        this.notifyConnectionListeners();
      }
    }
  }

  public loadScenario(scenario: DemoScenario): void {
    if (scenario === 'DEFAULT_DEMO') {
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

      this.nodes[0].tilt_deg = 0.5;
      this.nodes[0].load_kg = 1.0;
      this.nodes[3].tilt_deg = 0.7;
      this.nodes[4].tilt_deg = 0.8;
    } else if (scenario === 'ROCKBURST_SUBSIDENCE') {
      this.nodes[0].tilt_deg = 6.2;
      this.nodes[0].load_kg = 11.5;
      this.nodes[0].pressure = 96000;
    } else if (scenario === 'METHANE_OUTBURST') {
      this.nodes[1].gas_ppm_equiv = 14200;
      this.nodes[1].temperature = 42.5;
    } else if (scenario === 'FAULT_SHEAR_ACCELERATION') {
      this.nodes[2].tilt_deg = 7.4;
      this.nodes[2].load_kg = 13.8;
      this.nodes[2].pressure = 94500;
      this.nodes[2].temperature = 41.0;
      this.nodes[2].gas_ppm_equiv = 13000;
    } else if (scenario === 'ALL_SAFE_BASELINE') {
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

  public start(intervalMs: number = 1000): void {
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

  public isLive(): boolean {
    return this.isWokwiLive;
  }

  public setGatewayUrl(url: string): void {
    this.gatewayUrl = url;
    this.connectLiveStream();
  }

  public getGatewayUrl(): string {
    return this.gatewayUrl;
  }

  public getNodes(): NodeData[] {
    return JSON.parse(JSON.stringify(this.nodes));
  }

  public getBridgeStatus(): WokwiBridgeStatus {
    return {
      connected: this.isWokwiLive,
      totalPackets: this.totalPacketsReceived,
      lastPacketTime: this.lastPacketTimestamp,
    };
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

  public subscribeConnection(cb: (status: WokwiBridgeStatus) => void): () => void {
    this.connectionListeners.push(cb);
    cb(this.getBridgeStatus());
    return () => {
      this.connectionListeners = this.connectionListeners.filter((l) => l !== cb);
    };
  }

  private notifyListeners(alarm: AlarmState): void {
    const nodesCopy = this.getNodes();
    this.listeners.forEach((l) => l(nodesCopy, alarm));
  }

  private notifyConnectionListeners(): void {
    const status = this.getBridgeStatus();
    this.connectionListeners.forEach((l) => l(status));
  }
}

export const dataService = new DataService();
