/**
 * VANGUARD Mine Subsidence Monitoring System - TypeScript Type Definitions
 * Directly aligned with Wokwi ESP32-S3 firmware model and JSON API specifications.
 */

export type SensorState = 'NORMAL' | 'WARNING_SENSOR' | 'CRITICAL_SENSOR';

export type OverallRisk = 'SAFE' | 'WARNING' | 'DANGER';

export interface EvaluatedSensorStates {
  gas: SensorState;
  temperature: SensorState;
  pressure: SensorState;
  tilt: SensorState;
  load: SensorState;
}

export interface NodeData {
  node: string; // e.g. "NODE-1" .. "NODE-5"
  temperature: number; // °C
  humidity: number; // %
  pressure: number; // Pa
  gas_ppm_equiv: number; // Relative gas indicator ppm-equiv
  tilt_deg: number; // Inclinometer tilt in degrees
  load_kg: number; // Structural load cell in kg
  latitude: number; // GPS Latitude
  longitude: number; // GPS Longitude
  status: OverallRisk; // 'SAFE' | 'WARNING' | 'DANGER'
  risk_score: number; // 0 - 100
  warning_sensors: number; // 0 - 5
  critical_sensors: number; // 0 - 5
  sample_interval_seconds: number; // 40 (SAFE), 15 (WARNING), 3 (DANGER)
  packets_sent: number;
  battery_percent: number; // Simulated battery %

  // Frontend enriched metadata
  role?: string;
  pressureBaseline?: number;
  sensorStates?: EvaluatedSensorStates;
  buzzerActive?: boolean;
}

export interface GatewayNetworkPayload {
  gateway: string;
  network: string;
  nodes: NodeData[];
}

export interface AlarmState {
  mode: OverallRisk;
  activeNode: NodeData | null;
  activeBuzzerNodeId: string | null;
  sirenFrequencyHz: number;
}

export interface LoRaPacketLog {
  id: string;
  source: string;
  route: string;
  status: OverallRisk;
  gps: string;
  payload: {
    temp: number;
    gas: number;
    tilt: number;
    load: number;
    risk: number;
  };
  timestamp: string;
}

export interface AIAnalysisSummary {
  headline: string;
  status: OverallRisk;
  criticalNodeId: string | null;
  primaryRiskDrivers: string[];
  geotechnicalInterpretation: string;
  recommendedAction: string[];
  subsidenceVelocityDegPerHr: number;
}

export type DemoScenario = 
  | 'DEFAULT_DEMO' 
  | 'ROCKBURST_SUBSIDENCE' 
  | 'METHANE_OUTBURST' 
  | 'ALL_CLEAR_SAFE';
