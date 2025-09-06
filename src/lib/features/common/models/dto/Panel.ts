// PV panel domain models

import type { PanelTechnology } from "../enums/panelTechnology";


export interface PanelConfig {
  /** Tilt in degrees. Typical: ~ latitude */
  tiltDeg: number;
  /** Azimuth in degrees: 0=N, 90=E, 180=S, 270=W */
  azimuthDeg: number;
  technology: PanelTechnology;
  /** Module efficiency as 0..1 (e.g., 0.20 for 20%) */
  efficiency: number;
}