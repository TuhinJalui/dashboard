/**
 * VANGUARD Mine Subsidence System - Exact Constants & Thresholds
 * Directly referenced from src/main.cpp and Technical Handoff Document.
 */

import { NodeData } from './types';

// ============================================================
// EXACT SENSOR THRESHOLDS (src/main.cpp lines 220-238)
// ============================================================
export const SENSOR_THRESHOLDS = {
  // Gas (MQ-2 simulation / relative indicator, not certified methane)
  GAS_WARNING_PPM: 7500.0,
  GAS_CRITICAL_PPM: 12500.0,

  // Temperature (DHT22)
  TEMP_WARNING_C: 35.0,
  TEMP_CRITICAL_C: 40.0,

  // Pressure Drop from baseline (BMP180)
  PRESSURE_WARNING_DROP: 0.02, // 2% drop
  PRESSURE_CRITICAL_DROP: 0.04, // 4% drop

  // Tilt Angle (MPU6050 inclinometer)
  TILT_WARNING_DEG: 3.0,
  TILT_CRITICAL_DEG: 5.0,

  // Structural Roof Load (HX711 load cell)
  LOAD_WARNING_KG: 5.0,
  LOAD_CRITICAL_KG: 10.0,
} as const;

// ============================================================
// ADAPTIVE TRANSMISSION INTERVALS (src/main.cpp lines 33-38)
// ============================================================
export const TRANSMISSION_INTERVALS = {
  SAFE_SECONDS: 40,
  WARNING_SECONDS: 15,
  DANGER_SECONDS: 3,
} as const;

// ============================================================
// GPS LOCATIONS (src/main.cpp lines 167-183)
// ============================================================
export const NODE_COORDINATES = [
  { id: 'NODE-1', lat: 19.054400, lon: 73.068800, role: 'Real Hardware Sensors (Wokwi)' },
  { id: 'NODE-2', lat: 19.054650, lon: 73.069050, role: 'Virtual Monitoring Node' },
  { id: 'NODE-3', lat: 19.054900, lon: 73.069300, role: 'Virtual Monitoring Node (Critical Focus)' },
  { id: 'NODE-4', lat: 19.055150, lon: 73.069550, role: 'Virtual Monitoring Node' },
  { id: 'NODE-5', lat: 19.055400, lon: 73.069800, role: 'Virtual Node + LoRa Gateway' },
] as const;

// ============================================================
// LORA ROUTE DEFINITIONS (src/main.cpp getRoute() lines 1209-1243)
// ============================================================
export const LORA_ROUTES = [
  'NODE-1 -> NODE-2 -> NODE-3 -> NODE-4 -> NODE-5',
  'NODE-2 -> NODE-3 -> NODE-4 -> NODE-5',
  'NODE-3 -> NODE-4 -> NODE-5',
  'NODE-4 -> NODE-5',
  'NODE-5 -> GATEWAY',
] as const;

// ============================================================
// DEFAULT DEMONSTRATION PROFILES (src/main.cpp virtualProfiles[])
// ============================================================
export const INITIAL_DEMO_NODES: NodeData[] = [
  {
    node: 'NODE-1',
    role: 'Real Wokwi Sensors',
    temperature: 28.0,
    humidity: 60.0,
    pressure: 101325.0,
    pressureBaseline: 101325.0,
    gas_ppm_equiv: 1200.0,
    tilt_deg: 0.50,
    load_kg: 1.00,
    latitude: 19.054400,
    longitude: 73.068800,
    status: 'SAFE',
    risk_score: 0,
    warning_sensors: 0,
    critical_sensors: 0,
    sample_interval_seconds: 40,
    packets_sent: 142,
    battery_percent: 99.4,
    buzzerActive: false,
  },
  {
    node: 'NODE-2',
    role: 'Virtual Node (Gas Warning)',
    temperature: 30.0,
    humidity: 61.0,
    pressure: 100900.0,
    pressureBaseline: 101325.0,
    gas_ppm_equiv: 8500.0, // Gas is elevated above 7500 ppm warning threshold
    tilt_deg: 1.20,
    load_kg: 1.50,
    latitude: 19.054650,
    longitude: 73.069050,
    status: 'WARNING',
    risk_score: 12,
    warning_sensors: 1,
    critical_sensors: 0,
    sample_interval_seconds: 15,
    packets_sent: 278,
    battery_percent: 96.2,
    buzzerActive: false,
  },
  {
    node: 'NODE-3',
    role: 'Virtual Node (5 Warnings -> DANGER)',
    temperature: 37.0, // Warning (>=35°C)
    humidity: 68.0,
    pressure: 98000.0, // Warning (>2% drop: 3.28% drop)
    pressureBaseline: 101325.0,
    gas_ppm_equiv: 9000.0, // Warning (>=7500 ppm)
    tilt_deg: 3.50, // Warning (>=3.0°)
    load_kg: 6.00, // Warning (>=5.0 kg)
    latitude: 19.054900,
    longitude: 73.069300,
    status: 'DANGER', // 5 warnings simultaneously trigger DANGER!
    risk_score: 60, // 5 * 12 = 60
    warning_sensors: 5,
    critical_sensors: 0,
    sample_interval_seconds: 3, // High priority 3s TX
    packets_sent: 894,
    battery_percent: 88.5,
    buzzerActive: true, // 3000 Hz continuous audible beacon
  },
  {
    node: 'NODE-4',
    role: 'Virtual Node (Safe)',
    temperature: 28.5,
    humidity: 59.0,
    pressure: 101200.0,
    pressureBaseline: 101325.0,
    gas_ppm_equiv: 1500.0,
    tilt_deg: 0.70,
    load_kg: 1.50,
    latitude: 19.055150,
    longitude: 73.069550,
    status: 'SAFE',
    risk_score: 0,
    warning_sensors: 0,
    critical_sensors: 0,
    sample_interval_seconds: 40,
    packets_sent: 110,
    battery_percent: 98.9,
    buzzerActive: false,
  },
  {
    node: 'NODE-5',
    role: 'Gateway Node (Safe)',
    temperature: 29.0,
    humidity: 60.0,
    pressure: 101250.0,
    pressureBaseline: 101325.0,
    gas_ppm_equiv: 1800.0,
    tilt_deg: 0.80,
    load_kg: 1.80,
    latitude: 19.055400,
    longitude: 73.069800,
    status: 'SAFE',
    risk_score: 0,
    warning_sensors: 0,
    critical_sensors: 0,
    sample_interval_seconds: 40,
    packets_sent: 104,
    battery_percent: 99.1,
    buzzerActive: false,
  },
];
