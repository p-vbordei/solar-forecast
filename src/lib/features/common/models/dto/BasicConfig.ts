export interface BasicConfig {
  /** Nameplate capacity in megawatts (MW) */
  capacityMW: number;
  /** IANA timezone (e.g., "Europe/London") or "auto" */
  timezone: string | "auto";
}
