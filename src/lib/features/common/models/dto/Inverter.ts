export interface InverterConfig {
  /** e.g., "Generic 3-phase inverter" */
  model: string;
  /** Unitless, typically 0.8..1.0 */
  powerFactor: number;
}