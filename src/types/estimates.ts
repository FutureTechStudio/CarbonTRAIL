/** Output of the carbon engine for a single activity. */
export interface EstimateResult {
  co2eKg: number;
  baselineCo2eKg: number;
  savedCo2eKg: number;
  impactScore: number;
  confidence: number;
  factorRefs: string[];
}

/** Aggregated day totals from the carbon engine. */
export interface DayTotalsResult {
  createdCo2eKg: number;
  savedCo2eKg: number;
  netChangeCo2eKg: number;
  impactScore: number;
  confidence: number;
  dataCompleteness: number;
}

export interface FactorPackTransport {
  walk: number;
  cycle: number;
  scooter: number;
  motorbike: number;
  car: number;
  carpool: number;
  auto: number;
  cab: number;
  bus: number;
  metro: number;
  train: number;
  flight: number;
  ev: number;
}

export interface FactorPack {
  transport: FactorPackTransport;
  foodMeal: Record<string, number>;
  mealSourceAdjustments: Record<string, number>;
  packaging: Record<string, number>;
  electricity: { kgPerKwh: number };
  delivery: Record<string, number>;
  waste: Record<string, number>;
}
