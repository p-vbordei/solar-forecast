// create-location.request.ts
import type { GeoPoint } from "$lib/features/common/models/dto/GeoPoint";
import type { BasicConfig } from "$lib/features/common/models/dto/BasicConfig";
import type { PanelConfig } from "$lib/features/common/models/dto/Panel";
import type { InverterConfig } from "$lib/features/common/models/dto/Inverter";
import type { WeatherDependentPerformance } from "$lib/features/common/models/dto/WeatherDependentPerformance";

export interface CreateLocationRequest {
  // Required
  name: string;
  coordinates: GeoPoint;

  // Optional groups (backend can apply defaults)
  basic?: Partial<BasicConfig>;
  panel?: Partial<PanelConfig>;
  inverter?: Partial<InverterConfig>;
  performance?: Partial<WeatherDependentPerformance>;
}
